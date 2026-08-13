<?php

namespace App\Services;

use App\Models\FxRate;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * FX conversion + spread. In production this would poll a real rate provider
 * (e.g. Reuters, a regional aggregator) on a schedule; here we seed/refresh a
 * small static table and apply ObaPay's spread on top of mid-market.
 */
class FxService
{
    public function getMidMarketRate(string $base, string $quote): float
    {
        if ($base === $quote) {
            return 1.0;
        }

        $rate = FxRate::query()->where('base_currency', $base)->where('quote_currency', $quote)->first();
        if (! $rate) {
            throw new NotFoundHttpException("No FX rate available for {$base}->{$quote}");
        }

        return (float) $rate->rate;
    }

    /** Converts an amount and returns both the converted value and the spread captured as revenue. */
    public function convert(float $amount, string $base, string $quote): array
    {
        if ($base === $quote) {
            return ['converted' => $amount, 'spreadAmount' => 0.0];
        }

        $spreadPct = (float) config('obapay.fx_spread_pct', 0.5) / 100;
        $midRate = $this->getMidMarketRate($base, $quote);
        $rawConverted = $amount * $midRate;
        $spreadAmount = $rawConverted * $spreadPct;
        // User receives slightly less than mid-market; spread is ObaPay revenue.
        $converted = $rawConverted - $spreadAmount;

        return ['converted' => $converted, 'spreadAmount' => $spreadAmount];
    }

    public function upsertRate(string $base, string $quote, float $rate, string $source = 'internal'): FxRate
    {
        return FxRate::query()->updateOrCreate(
            ['base_currency' => $base, 'quote_currency' => $quote],
            ['rate' => $rate, 'source' => $source, 'fetched_at' => now()],
        );
    }
}
