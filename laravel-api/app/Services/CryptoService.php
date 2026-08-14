<?php

namespace App\Services;

use App\Models\CryptoHolding;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Simulated cryptocurrency buy/sell. There is no real exchange, custody, or
 * on-chain settlement here — trading real crypto requires licensing (most
 * jurisdictions treat it as a regulated money-services/VASP activity),
 * secure key custody, and AML transaction monitoring far beyond what an
 * unattended coding session should wire up. This gives the full buy/sell/hold
 * UX against a mock price feed and the wallet ledger, exactly like the mock
 * courier and airtime modules simulate their respective third parties.
 */
class CryptoService
{
    // Base mock prices in USD; a small deterministic-per-minute jitter is
    // applied so the feed looks "live" without needing a real price oracle.
    private const BASE_PRICES_USD = [
        'BTC' => 62000, 'ETH' => 3400, 'USDT' => 1, 'BNB' => 580, 'SOL' => 145, 'XRP' => 0.62,
    ];

    public function getPrices(): array
    {
        $minuteSeed = intdiv(time(), 60);

        return collect(self::BASE_PRICES_USD)->map(function ($basePrice, $symbol) use ($minuteSeed) {
            mt_srand(crc32($symbol.$minuteSeed));
            $jitterPct = (mt_rand(-150, 150)) / 10000; // ±1.5%
            mt_srand(); // reseed randomly so nothing else in the request is affected

            return [
                'symbol' => $symbol,
                'name' => $this->name($symbol),
                'priceUsd' => round($basePrice * (1 + $jitterPct), $basePrice < 10 ? 4 : 2),
                'change24hPct' => round($jitterPct * 100, 2),
            ];
        })->values()->all();
    }

    public function getHoldings(string $userId): array
    {
        $prices = collect($this->getPrices())->keyBy('symbol');

        return CryptoHolding::query()->where('user_id', $userId)->where('quantity', '>', 0)->get()
            ->map(function (CryptoHolding $holding) use ($prices) {
                $price = $prices[$holding->symbol]['priceUsd'] ?? 0;

                return [
                    'symbol' => $holding->symbol,
                    'quantity' => $holding->quantity,
                    'priceUsd' => $price,
                    'valueUsd' => round((float) $holding->quantity * $price, 2),
                ];
            })->values()->all();
    }

    /** Spends fiat from a wallet to buy crypto at the current mock price (fiat currency is converted to USD via FxService if not already USD). */
    public function buy(array $params, FxService $fx): Transaction
    {
        $price = $this->priceOf($params['symbol']);
        if ($params['fiatAmount'] <= 0) {
            throw new BadRequestHttpException('Amount must be positive');
        }

        $usdAmount = $params['currency'] === 'USD'
            ? $params['fiatAmount']
            : $fx->convert($params['fiatAmount'], $params['currency'], 'USD')['converted'];
        $quantity = round($usdAmount / $price, 8);

        return DB::transaction(function () use ($params, $price, $quantity) {
            $wallet = Wallet::query()
                ->where('user_id', $params['callerId'])->where('currency', $params['currency'])
                ->lockForUpdate()->first();
            if (! $wallet || (float) $wallet->balance < $params['fiatAmount']) {
                throw new BadRequestHttpException('Insufficient wallet balance');
            }

            $wallet->decrement('balance', $params['fiatAmount']);

            $holding = CryptoHolding::query()->firstOrCreate(
                ['user_id' => $params['callerId'], 'symbol' => $params['symbol']],
            );
            $holding->increment('quantity', $quantity);

            return Transaction::query()->create([
                'type' => 'CRYPTO_BUY',
                'status' => 'COMPLETED',
                'amount' => $params['fiatAmount'],
                'currency' => $params['currency'],
                'source_wallet_id' => $wallet->id,
                'idempotency_key' => $params['idempotencyKey'],
                'narration' => "Bought {$quantity} {$params['symbol']} at \${$price}",
                'metadata' => ['symbol' => $params['symbol'], 'quantity' => $quantity, 'priceUsd' => $price],
            ]);
        });
    }

    public function sell(array $params, FxService $fx): Transaction
    {
        $price = $this->priceOf($params['symbol']);
        if ($params['quantity'] <= 0) {
            throw new BadRequestHttpException('Quantity must be positive');
        }

        $usdValue = $params['quantity'] * $price;
        $fiatAmount = $params['currency'] === 'USD'
            ? $usdValue
            : $fx->convert($usdValue, 'USD', $params['currency'])['converted'];
        $fiatAmount = round($fiatAmount, 2);

        return DB::transaction(function () use ($params, $price, $fiatAmount) {
            $holding = CryptoHolding::query()
                ->where('user_id', $params['callerId'])->where('symbol', $params['symbol'])
                ->lockForUpdate()->first();
            if (! $holding || (float) $holding->quantity < $params['quantity']) {
                throw new BadRequestHttpException("Insufficient {$params['symbol']} balance");
            }

            $holding->decrement('quantity', $params['quantity']);

            $wallet = Wallet::query()->firstOrCreate(['user_id' => $params['callerId'], 'currency' => $params['currency']]);
            $wallet->increment('balance', $fiatAmount);

            return Transaction::query()->create([
                'type' => 'CRYPTO_SELL',
                'status' => 'COMPLETED',
                'amount' => $fiatAmount,
                'currency' => $params['currency'],
                'destination_wallet_id' => $wallet->id,
                'idempotency_key' => $params['idempotencyKey'],
                'narration' => "Sold {$params['quantity']} {$params['symbol']} at \${$price}",
                'metadata' => ['symbol' => $params['symbol'], 'quantity' => $params['quantity'], 'priceUsd' => $price],
            ]);
        });
    }

    private function priceOf(string $symbol): float
    {
        $match = collect($this->getPrices())->firstWhere('symbol', $symbol);
        if (! $match) {
            throw new BadRequestHttpException('Unsupported asset');
        }
        return $match['priceUsd'];
    }

    private function name(string $symbol): string
    {
        return [
            'BTC' => 'Bitcoin', 'ETH' => 'Ethereum', 'USDT' => 'Tether', 'BNB' => 'BNB', 'SOL' => 'Solana', 'XRP' => 'XRP',
        ][$symbol] ?? $symbol;
    }
}
