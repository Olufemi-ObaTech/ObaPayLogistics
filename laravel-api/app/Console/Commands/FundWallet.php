<?php

namespace App\Console\Commands;

use App\Models\Wallet;
use Illuminate\Console\Command;

/**
 * Ops helper: credits a wallet directly, bypassing the payment rails. There
 * is no real money-in rail (card/bank transfer) wired up in this MVP, so
 * this is how test/demo wallets get funded for now.
 */
class FundWallet extends Command
{
    protected $signature = 'obapay:fund-wallet {email} {currency} {amount}';

    protected $description = 'Sets a wallet balance directly for a user by email + currency.';

    public function handle(): int
    {
        $user = \App\Models\User::query()->where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('User not found');
            return self::FAILURE;
        }

        $wallet = Wallet::query()->firstOrCreate(
            ['user_id' => $user->id, 'currency' => strtoupper($this->argument('currency'))],
        );
        $wallet->update(['balance' => $this->argument('amount')]);

        $this->info("Funded {$wallet->currency} wallet for {$user->email}: balance={$wallet->balance}");
        return self::SUCCESS;
    }
}
