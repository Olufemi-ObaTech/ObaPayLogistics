<?php

namespace App\Services;

use App\Models\CourierPartner;
use App\Models\Shipment;
use App\Models\TrackingEvent;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ShipmentService
{
    public function __construct(
        private readonly WalletService $wallet,
        private readonly FxService $fx,
        private readonly NotificationService $notification,
        private readonly CourierService $courier,
        private readonly GeocodingService $geocoding,
    ) {
    }

    /** GET /rates — quote before creating a shipment, no persistence required. */
    public function getRateEstimate(array $order): array
    {
        $result = $this->courier->shop($order);

        return [
            'recommended' => $result['winner'],
            'allQuotes' => $result['allQuotes'],
            'unavailableCouriers' => $result['failedCouriers'],
        ];
    }

    /**
     * POST /shipment/create — validates addresses, rate-shops across couriers,
     * and persists a PENDING_PAYMENT shipment with the price locked in (in the
     * user's preferred currency, margin included) for the user to confirm.
     */
    public function createShipment(string $userId, array $dto): array
    {
        $user = User::query()->findOrFail($userId);

        // Geocoding validates the addresses are resolvable; failure here is a
        // hard stop (bad address), unlike downstream courier flakiness which
        // degrades gracefully.
        $this->geocoding->validateAndGeocode($dto['originAddress']);
        $this->geocoding->validateAndGeocode($dto['destinationAddress']);

        $order = [
            'origin' => $dto['originAddress'],
            'destination' => $dto['destinationAddress'],
            'weightKg' => $dto['weightKg'],
            'dimensions' => $dto['dimensionsCm'],
            'shippingMethod' => $dto['shippingMethod'],
        ];

        $shopped = $this->courier->shop($order);
        $winner = $shopped['winner'];

        [$finalPrice, $marginAmount, $priceCurrency] = $this->applyMargin($winner['amount'], $winner['currency'], $user->preferred_currency);

        $shipment = Shipment::query()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'origin_address' => $dto['originAddress'],
            'destination_address' => $dto['destinationAddress'],
            'weight_kg' => $dto['weightKg'],
            'dimensions_cm' => $dto['dimensionsCm'],
            'declared_value' => $dto['declaredValue'],
            'declared_value_currency' => $dto['declaredValueCurrency'] ?? 'USD',
            'customs_category' => $dto['customsCategory'],
            'shipping_method' => $dto['shippingMethod'],
            'status' => 'PENDING_PAYMENT',
            'quoted_rate' => $winner['amount'],
            'final_price' => $finalPrice,
            'price_currency' => $priceCurrency,
            'margin_amount' => $marginAmount,
            'courier_partner_id' => $this->resolveCourierPartnerId($winner['courierCode']),
        ]);

        TrackingEvent::query()->create([
            'shipment_id' => $shipment->id,
            'location' => $dto['originAddress']['city'],
            'status' => 'PENDING_PAYMENT',
            'description' => "Shipment created. Best rate: {$winner['courierCode']} (".count($shopped['allQuotes']).' quotes'.
                (count($shopped['failedCouriers']) ? ', '.count($shopped['failedCouriers']).' partner(s) unavailable' : '').')',
            'source' => 'internal',
        ]);

        logger()->info('shipment_created', ['shipmentId' => $shipment->id, 'userId' => $userId, 'courier' => $winner['courierCode'], 'finalPrice' => $finalPrice]);

        return [
            'shipment' => $shipment,
            'estimatedCost' => ['amount' => $finalPrice, 'currency' => $priceCurrency],
            'selectedCourier' => $winner['courierCode'],
            'allQuotes' => $shopped['allQuotes'],
        ];
    }

    /**
     * POST /shipment/confirm — deducts the locked-in price from the user's
     * wallet into escrow, then hands the order to the winning courier to
     * obtain a real tracking number and kick off pickup.
     */
    public function payForShipment(string $callerId, string $shipmentId, string $walletId, string $idempotencyKey): Shipment
    {
        $shipment = Shipment::query()->with('courierPartner')->find($shipmentId);
        if (! $shipment) {
            throw new NotFoundHttpException('Shipment not found');
        }
        // Ownership check first: a shipment lookup should never confirm to an
        // attacker whether a given shipmentId exists if it isn't theirs.
        if ($shipment->user_id !== $callerId) {
            throw new NotFoundHttpException('Shipment not found');
        }
        if ($shipment->status !== 'PENDING_PAYMENT') {
            throw new BadRequestHttpException("Shipment is in status {$shipment->status}, cannot pay");
        }
        if (! $shipment->final_price || ! $shipment->price_currency || ! $shipment->courierPartner) {
            throw new BadRequestHttpException('Shipment is missing a locked-in rate; request a new quote');
        }

        // 1. Move funds into escrow (fails fast with a clear error on
        // insufficient balance; holdForShipment independently re-verifies wallet ownership).
        $this->wallet->holdForShipment([
            'idempotencyKey' => $idempotencyKey,
            'callerId' => $callerId,
            'walletId' => $walletId,
            'shipmentId' => $shipmentId,
            'amount' => (float) $shipment->final_price,
        ]);

        // 2. Hand off to the courier. If this fails, the escrow hold stays
        // HELD and an operator/retry job can re-attempt handoff without re-charging the user.
        $order = [
            'origin' => $shipment->origin_address,
            'destination' => $shipment->destination_address,
            'weightKg' => (float) $shipment->weight_kg,
            'dimensions' => $shipment->dimensions_cm,
            'shippingMethod' => $shipment->shipping_method,
        ];

        try {
            $result = $this->courier->createShipment($shipment->courierPartner->code, $order);
            $trackingNumber = $result['trackingNumber'];
        } catch (\Throwable $e) {
            logger()->error('courier_handoff_failed', ['shipmentId' => $shipmentId, 'courier' => $shipment->courierPartner->code, 'error' => $e->getMessage()]);
            throw new BadRequestHttpException('Payment succeeded but courier pickup could not be scheduled yet; our team will retry automatically');
        }

        $shipment->update(['status' => 'PAID', 'paid_at' => now(), 'tracking_number' => $trackingNumber]);

        TrackingEvent::query()->create([
            'shipment_id' => $shipmentId,
            'location' => $shipment->origin_address['city'] ?? 'origin',
            'status' => 'PAID',
            'description' => "Payment confirmed. Courier {$shipment->courierPartner->name} assigned tracking number {$trackingNumber}.",
            'source' => 'internal',
        ]);

        $this->notification->notifyUser($shipment->user_id, 'shipment.paid', ['shipmentId' => $shipmentId, 'trackingNumber' => $trackingNumber]);

        // Kick off pickup + the simulated customs clearance timeline; MVP only.
        $this->simulatePickupAndTransit($shipmentId);

        return $shipment->fresh();
    }

    /**
     * GET /shipment/:id/track — returns the latest known status. Prefers live
     * courier events (cached briefly) but always has the internally stored
     * event log as a fallback if the courier API is unreachable.
     */
    public function track(string $shipmentId, string $userId): array
    {
        $shipment = Shipment::query()->with(['courierPartner', 'trackingEvents' => fn ($q) => $q->orderByDesc('timestamp')])->find($shipmentId);
        if (! $shipment || $shipment->user_id !== $userId) {
            throw new NotFoundHttpException('Shipment not found');
        }

        if ($shipment->tracking_number && $shipment->courierPartner) {
            $cacheKey = "tracking:{$shipment->tracking_number}";
            if (! Cache::has($cacheKey)) {
                try {
                    $events = $this->courier->getTrackingEvents($shipment->courierPartner->code, $shipment->tracking_number);
                    if (! empty($events)) {
                        $latest = end($events);
                        TrackingEvent::query()->create([
                            'shipment_id' => $shipmentId,
                            'location' => $latest['location'],
                            // Courier's native status is mapped upstream in production; kept as-is for MVP.
                            'status' => $shipment->status,
                            'description' => $latest['description'],
                            'source' => $shipment->courierPartner->code,
                            'timestamp' => $latest['timestamp'],
                        ]);
                    }
                    Cache::put($cacheKey, true, 30);
                } catch (\Throwable $e) {
                    logger()->warning("Live tracking fetch failed for {$shipmentId}, serving cached events: {$e->getMessage()}");
                }
            }
        }

        $events = TrackingEvent::query()->where('shipment_id', $shipmentId)->orderByDesc('timestamp')->get();

        return ['shipment' => $shipment, 'latestEvent' => $events->first(), 'events' => $events];
    }

    /** GET /shipment/history */
    public function history(string $userId)
    {
        return Shipment::query()->with('courierPartner')->where('user_id', $userId)->orderByDesc('created_at')->get();
    }

    // -------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------

    private function applyMargin(float $courierAmount, string $courierCurrency, string $userCurrency): array
    {
        $marginPct = (float) config('obapay.logistics_margin_pct', 8) / 100;
        $conversion = $this->fx->convert($courierAmount, $courierCurrency, $userCurrency);
        $marginAmount = $conversion['converted'] * $marginPct;
        $finalPrice = $conversion['converted'] + $marginAmount;

        return [$finalPrice, $marginAmount, $userCurrency];
    }

    private function resolveCourierPartnerId(string $code): string
    {
        $partner = CourierPartner::query()->firstOrCreate(
            ['code' => $code],
            [
                'name' => $code,
                'api_endpoint' => 'stub',
                'api_key' => 'stub',
                'supported_countries' => [],
                'supported_methods' => ['AIR', 'SEA', 'ROAD'],
            ],
        );

        return $partner->id;
    }

    /**
     * MVP border-crossing simulation: pickup -> in transit -> customs
     * clearance -> auto-cleared after a random 1-5 minute delay -> delivered.
     *
     * The clearance delay is persisted (customs_clear_at) and resolved by a
     * cron sweep (see App\Console\Commands\SweepCustomsClearance), not an
     * in-process timer: a bare timer is lost on deploy/restart/crash (escrow
     * would stay HELD forever) and doesn't work once this runs as more than
     * one instance.
     */
    private function simulatePickupAndTransit(string $shipmentId): void
    {
        $this->advanceStatus($shipmentId, 'PICKED_UP', 'Courier picked up the parcel');
        $this->advanceStatus($shipmentId, 'IN_TRANSIT', 'Parcel in transit');
        $this->advanceStatus($shipmentId, 'CUSTOMS_CLEARANCE', 'Parcel arrived at destination customs checkpoint');

        $minDelay = (int) config('obapay.customs_auto_clear_min_delay_ms', 60000);
        $maxDelay = (int) config('obapay.customs_auto_clear_max_delay_ms', 300000);
        $delayMs = $minDelay + random_int(0, max(0, $maxDelay - $minDelay));

        Shipment::query()->where('id', $shipmentId)->update([
            'customs_clear_at' => now()->addMilliseconds($delayMs),
        ]);
    }

    /** Periodic sweep entry point: clears any shipment whose customs delay has elapsed. */
    public function sweepCustomsClearance(): void
    {
        $due = Shipment::query()
            ->where('status', 'CUSTOMS_CLEARANCE')
            ->whereNotNull('customs_clear_at')
            ->where('customs_clear_at', '<=', now())
            ->limit(100)
            ->pluck('id');

        foreach ($due as $shipmentId) {
            // Distributed lock so two instances ticking at the same moment
            // don't both try to release the same escrow hold.
            $lock = Cache::lock("customs-clear-lock:{$shipmentId}", 60);
            if (! $lock->get()) {
                continue;
            }
            try {
                $this->autoClearCustoms($shipmentId);
            } catch (\Throwable $e) {
                logger()->error("Customs auto-clear sweep failed for {$shipmentId}: {$e->getMessage()}");
            } finally {
                $lock->release();
            }
        }
    }

    private function autoClearCustoms(string $shipmentId): void
    {
        $shipment = Shipment::query()->find($shipmentId);
        if (! $shipment || $shipment->status !== 'CUSTOMS_CLEARANCE') {
            return;
        }

        $this->advanceStatus($shipmentId, 'DELIVERED', 'Cleared customs and delivered to recipient');
        $shipment->update(['delivered_at' => now(), 'customs_clear_at' => null]);
        $this->wallet->releaseEscrowToCourier($shipmentId);
        $this->notification->notifyUser($shipment->user_id, 'shipment.delivered', ['shipmentId' => $shipmentId]);
    }

    private function advanceStatus(string $shipmentId, string $status, string $description): Shipment
    {
        $shipment = Shipment::query()->findOrFail($shipmentId);
        $shipment->update(['status' => $status]);

        $destination = $shipment->destination_address;
        TrackingEvent::query()->create([
            'shipment_id' => $shipmentId,
            'status' => $status,
            'location' => $destination['city'] ?? 'in transit',
            'description' => $description,
            'source' => 'internal',
        ]);

        return $shipment;
    }
}
