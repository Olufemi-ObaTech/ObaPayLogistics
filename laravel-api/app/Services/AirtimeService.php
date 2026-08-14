<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Airtime/data top-up and resale. There is no real telco/VTU aggregator
 * wired up (that requires a commercial integration, e.g. Reloadly, VTpass,
 * or a direct MNO agreement) — this simulates instant success against the
 * wallet ledger so the product flow can be demoed and built against, the
 * same way the courier module simulates DHL/Aramex/Sendy.
 */
class AirtimeService
{
    public const NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE', 'SAFARICOM', 'VODACOM'];

    // Mock data bundle catalogue, priced in NGN. A real deployment would
    // fetch this from the VTU aggregator per network.
    public const DATA_BUNDLES = [
        ['code' => 'D_1GB_30D', 'label' => '1GB — 30 days', 'price' => 350],
        ['code' => 'D_2GB_30D', 'label' => '2GB — 30 days', 'price' => 650],
        ['code' => 'D_5GB_30D', 'label' => '5GB — 30 days', 'price' => 1500],
        ['code' => 'D_10GB_30D', 'label' => '10GB — 30 days', 'price' => 2800],
    ];

    // Airtime resale ("sell") pays out below face value — the discount is
    // ObaPay's margin, mirroring how real airtime-to-cash services work.
    private const RESALE_RATE = 0.85;

    public function buyAirtime(array $params): Transaction
    {
        $this->assertNetwork($params['network']);
        if ($params['amount'] <= 0) {
            throw new BadRequestHttpException('Amount must be positive');
        }

        return $this->debit(
            $params['callerId'], $params['currency'], $params['amount'], $params['idempotencyKey'],
            "Airtime top-up: {$params['network']} {$params['phoneNumber']}",
            ['kind' => 'AIRTIME', 'network' => $params['network'], 'phoneNumber' => $params['phoneNumber']],
        );
    }

    public function buyData(array $params): Transaction
    {
        $this->assertNetwork($params['network']);
        $bundle = collect(self::DATA_BUNDLES)->firstWhere('code', $params['bundleCode']);
        if (! $bundle) {
            throw new BadRequestHttpException('Unknown data bundle');
        }

        return $this->debit(
            $params['callerId'], $params['currency'], $bundle['price'], $params['idempotencyKey'],
            "Data bundle: {$params['network']} {$bundle['label']} for {$params['phoneNumber']}",
            ['kind' => 'DATA', 'network' => $params['network'], 'phoneNumber' => $params['phoneNumber'], 'bundleCode' => $bundle['code']],
        );
    }

    /** "Sell" unused airtime back for cash, at a discount to face value — fully simulated, no real balance check against the telco. */
    public function sellAirtime(array $params): Transaction
    {
        $this->assertNetwork($params['network']);
        if ($params['amount'] <= 0) {
            throw new BadRequestHttpException('Amount must be positive');
        }
        $payout = round($params['amount'] * self::RESALE_RATE, 2);

        return DB::transaction(function () use ($params, $payout) {
            $wallet = Wallet::query()
                ->where('user_id', $params['callerId'])->where('currency', $params['currency'])
                ->lockForUpdate()->first();
            if (! $wallet) {
                $wallet = Wallet::query()->create(['user_id' => $params['callerId'], 'currency' => $params['currency']]);
            }

            $wallet->increment('balance', $payout);

            return Transaction::query()->create([
                'type' => 'WALLET_TOPUP',
                'status' => 'COMPLETED',
                'amount' => $payout,
                'currency' => $params['currency'],
                'destination_wallet_id' => $wallet->id,
                'idempotency_key' => $params['idempotencyKey'],
                'narration' => "Airtime resale: {$params['network']} {$params['phoneNumber']} (85% of face value)",
                'metadata' => ['kind' => 'AIRTIME_RESALE', 'network' => $params['network'], 'phoneNumber' => $params['phoneNumber'], 'faceValue' => $params['amount']],
            ]);
        });
    }

    private function debit(string $callerId, string $currency, float $amount, string $idempotencyKey, string $narration, array $metadata): Transaction
    {
        return DB::transaction(function () use ($callerId, $currency, $amount, $idempotencyKey, $narration, $metadata) {
            $wallet = Wallet::query()
                ->where('user_id', $callerId)->where('currency', $currency)
                ->lockForUpdate()->first();

            if (! $wallet) {
                throw new AccessDeniedHttpException("You don't have a {$currency} wallet yet");
            }
            if ((float) $wallet->balance < $amount) {
                throw new BadRequestHttpException('Insufficient wallet balance');
            }

            $wallet->decrement('balance', $amount);

            return Transaction::query()->create([
                'type' => 'BILL_PAYMENT',
                'status' => 'COMPLETED',
                'amount' => $amount,
                'currency' => $currency,
                'source_wallet_id' => $wallet->id,
                'idempotency_key' => $idempotencyKey,
                'narration' => $narration,
                'metadata' => $metadata,
            ]);
        });
    }

    private function assertNetwork(string $network): void
    {
        if (! in_array(strtoupper($network), self::NETWORKS, true)) {
            throw new BadRequestHttpException('Unsupported network');
        }
    }
}
