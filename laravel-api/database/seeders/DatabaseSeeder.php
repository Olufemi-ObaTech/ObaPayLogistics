<?php

namespace Database\Seeders;

use App\Models\FxRate;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Approximate mid-market rates (units of currency per 1 USD) used to
     * derive every ordered pair among the wallet-supported currencies. Not
     * live rates — a real deployment would poll a rate provider on a
     * schedule (see FxService docblock); this just makes the demo usable.
     */
    public function run(): void
    {
        $perUsd = [
            'USD' => 1,
            'NGN' => 1550,
            'KES' => 129,
            'ZAR' => 18.5,
            'GHS' => 15.5,
            'EUR' => 0.92,
            'XOF' => 610,
            'EGP' => 49,
        ];

        foreach ($perUsd as $base => $baseRate) {
            foreach ($perUsd as $quote => $quoteRate) {
                if ($base === $quote) {
                    continue;
                }

                FxRate::query()->updateOrCreate(
                    ['base_currency' => $base, 'quote_currency' => $quote],
                    ['rate' => $quoteRate / $baseRate, 'source' => 'seed', 'fetched_at' => now()],
                );
            }
        }
    }
}
