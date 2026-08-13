<?php

namespace App\Services;

use App\Models\EscrowHold;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class WalletService
{
    public function __construct(private readonly FxService $fx)
    {
    }

    public function getOrCreateWallet(string $userId, string $currency): Wallet
    {
        return Wallet::query()->firstOrCreate(['user_id' => $userId, 'currency' => $currency]);
    }

    public function getBalances(string $userId)
    {
        return Wallet::query()->where('user_id', $userId)->get();
    }

    /**
     * Free P2P transfer between two ObaPay wallets. No fee is captured here —
     * per the business rules, end-user P2P/bill-pay/intra-wallet moves are
     * 100% free. Cross-currency transfers apply the FX spread as ObaPay's
     * only revenue on this path.
     */
    public function p2pTransfer(array $params): Transaction
    {
        if ($params['amount'] <= 0) {
            throw new BadRequestHttpException('Amount must be positive');
        }
        if ($params['sourceWalletId'] === $params['destinationWalletId']) {
            throw new BadRequestHttpException('Source and destination wallets must be different');
        }

        return DB::transaction(function () use ($params) {
            // Lock both wallet rows for the duration of the transaction so two
            // concurrent transfers touching the same wallet can't both read a
            // stale balance and cause a lost update (classic double-spend race).
            [$first, $second] = [$params['sourceWalletId'], $params['destinationWalletId']];
            $ordered = [$first, $second];
            sort($ordered); // always lock in a fixed order to avoid deadlocks

            $locked = Wallet::query()->whereIn('id', $ordered)->lockForUpdate()->get()->keyBy('id');
            $source = $locked->get($params['sourceWalletId']);
            $destination = $locked->get($params['destinationWalletId']);

            if (! $source || ! $destination) {
                throw new NotFoundHttpException('Wallet not found');
            }

            // Authorization: the caller may only move funds OUT of a wallet
            // they own. Without this check, any authenticated user could drain
            // any wallet by guessing/observing its id.
            if ($source->user_id !== $params['callerId']) {
                throw new AccessDeniedHttpException('You do not own the source wallet');
            }

            if ((float) $source->balance < $params['amount']) {
                throw new BadRequestHttpException('Insufficient wallet balance');
            }

            $creditAmount = $params['amount'];
            $spreadAmount = 0.0;
            if ($source->currency !== $destination->currency) {
                $conversion = $this->fx->convert($params['amount'], $source->currency, $destination->currency);
                $creditAmount = $conversion['converted'];
                $spreadAmount = $conversion['spreadAmount'];
            }

            $source->decrement('balance', $params['amount']);
            $destination->increment('balance', $creditAmount);

            return Transaction::query()->create([
                'type' => 'P2P_TRANSFER',
                'status' => 'COMPLETED',
                'amount' => $params['amount'],
                'currency' => $source->currency,
                'fx_spread_amount' => $spreadAmount,
                'source_wallet_id' => $source->id,
                'destination_wallet_id' => $destination->id,
                'idempotency_key' => $params['idempotencyKey'],
                'narration' => $params['narration'] ?? 'P2P transfer',
            ]);
        });
    }

    /**
     * Merchant is identified by userId (never a raw wallet id) and the payer
     * wallet is always resolved from the authenticated caller, so a request
     * body can never redirect funds out of someone else's wallet.
     */
    public function merchantSettlement(array $params): Transaction
    {
        if ($params['amount'] <= 0) {
            throw new BadRequestHttpException('Amount must be positive');
        }
        if ($params['merchantUserId'] === $params['callerId']) {
            throw new BadRequestHttpException('Cannot settle a payment to yourself');
        }

        $feePct = (float) config('obapay.merchant_settlement_fee_pct', 1.5) / 100;

        return DB::transaction(function () use ($params, $feePct) {
            $merchant = User::query()->find($params['merchantUserId']);
            if (! $merchant || $merchant->status !== 'ACTIVE') {
                throw new NotFoundHttpException('Merchant not found or not active');
            }

            $payer = Wallet::query()
                ->where('user_id', $params['callerId'])->where('currency', $params['currency'])
                ->lockForUpdate()->firstOrFail();

            if ((float) $payer->balance < $params['amount']) {
                throw new BadRequestHttpException('Insufficient wallet balance');
            }

            $merchantWallet = Wallet::query()
                ->where('user_id', $params['merchantUserId'])->where('currency', $params['currency'])
                ->lockForUpdate()->first();
            if (! $merchantWallet) {
                $merchantWallet = Wallet::query()->create(['user_id' => $params['merchantUserId'], 'currency' => $params['currency']]);
            }

            $fee = $params['amount'] * $feePct;
            $netToMerchant = $params['amount'] - $fee;

            $payer->decrement('balance', $params['amount']);
            $merchantWallet->increment('balance', $netToMerchant);

            return Transaction::query()->create([
                'type' => 'MERCHANT_SETTLEMENT',
                'status' => 'COMPLETED',
                'amount' => $params['amount'],
                'currency' => $payer->currency,
                'fee_amount' => $fee,
                'source_wallet_id' => $payer->id,
                'destination_wallet_id' => $merchantWallet->id,
                'idempotency_key' => $params['idempotencyKey'],
                'narration' => 'Merchant settlement',
            ]);
        });
    }

    // -------------------------------------------------------------------
    // Shipping / escrow — used exclusively by ShipmentService::payForShipment
    // -------------------------------------------------------------------

    /**
     * Deducts the shipment's final price from the user's wallet and places it
     * into escrow (held_balance) rather than immediately crediting a courier
     * wallet. Funds are only actually "spent" (released) on delivery, and
     * refunded back to the user if the shipment is cancelled/returned pre-transit.
     */
    public function holdForShipment(array $params): array
    {
        if ($params['amount'] <= 0) {
            throw new BadRequestHttpException('Shipping amount must be positive');
        }

        return DB::transaction(function () use ($params) {
            $wallet = Wallet::query()->where('id', $params['walletId'])->lockForUpdate()->firstOrFail();

            if ($wallet->user_id !== $params['callerId']) {
                throw new AccessDeniedHttpException('You do not own this wallet');
            }
            if ((float) $wallet->balance < $params['amount']) {
                throw new BadRequestHttpException('Insufficient wallet balance to pay for shipping');
            }

            $wallet->decrement('balance', $params['amount']);
            $wallet->increment('held_balance', $params['amount']);

            $escrow = EscrowHold::query()->create([
                'shipment_id' => $params['shipmentId'],
                'wallet_id' => $wallet->id,
                'amount' => $params['amount'],
                'currency' => $wallet->currency,
                'status' => 'HELD',
            ]);

            $transaction = Transaction::query()->create([
                'type' => 'SHIPPING_PAYMENT',
                'status' => 'COMPLETED',
                'amount' => $params['amount'],
                'currency' => $wallet->currency,
                'source_wallet_id' => $wallet->id,
                'shipment_id' => $params['shipmentId'],
                'idempotency_key' => $params['idempotencyKey'],
                'narration' => 'Shipping fee held in escrow',
            ]);

            logger()->info('escrow_held', ['shipmentId' => $params['shipmentId'], 'escrowId' => $escrow->id, 'amount' => $params['amount']]);

            return ['escrow' => $escrow, 'transaction' => $transaction];
        });
    }

    /** Called when a shipment reaches DELIVERED: escrow funds are released to ObaPay/courier settlement. */
    public function releaseEscrowToCourier(string $shipmentId): EscrowHold
    {
        return DB::transaction(function () use ($shipmentId) {
            $escrow = EscrowHold::query()->where('shipment_id', $shipmentId)->lockForUpdate()->first();
            if (! $escrow) {
                throw new NotFoundHttpException('No escrow hold found for this shipment');
            }
            if ($escrow->status !== 'HELD') {
                return $escrow;
            }

            $wallet = Wallet::query()->where('id', $escrow->wallet_id)->lockForUpdate()->firstOrFail();
            $wallet->decrement('held_balance', $escrow->amount);

            $escrow->update(['status' => 'RELEASED_TO_COURIER', 'resolved_at' => now()]);

            logger()->info('escrow_released_to_courier', ['shipmentId' => $shipmentId, 'escrowId' => $escrow->id]);

            return $escrow;
        });
    }

    /** Called when a shipment is cancelled/returned before pickup: refund the user in full. */
    public function refundEscrowToUser(string $shipmentId, string $idempotencyKey): EscrowHold
    {
        return DB::transaction(function () use ($shipmentId, $idempotencyKey) {
            $escrow = EscrowHold::query()->where('shipment_id', $shipmentId)->lockForUpdate()->first();
            if (! $escrow) {
                throw new NotFoundHttpException('No escrow hold found for this shipment');
            }
            if ($escrow->status !== 'HELD') {
                return $escrow;
            }

            $wallet = Wallet::query()->where('id', $escrow->wallet_id)->lockForUpdate()->firstOrFail();
            $wallet->decrement('held_balance', $escrow->amount);
            $wallet->increment('balance', $escrow->amount);

            $escrow->update(['status' => 'REFUNDED_TO_USER', 'resolved_at' => now()]);

            Transaction::query()->create([
                'type' => 'SHIPPING_REFUND',
                'status' => 'COMPLETED',
                'amount' => $escrow->amount,
                'currency' => $escrow->currency,
                'destination_wallet_id' => $wallet->id,
                'shipment_id' => $shipmentId,
                'idempotency_key' => $idempotencyKey,
                'narration' => 'Shipping fee refunded (shipment cancelled/returned)',
            ]);

            logger()->info('escrow_refunded', ['shipmentId' => $shipmentId, 'escrowId' => $escrow->id]);

            return $escrow;
        });
    }
}
