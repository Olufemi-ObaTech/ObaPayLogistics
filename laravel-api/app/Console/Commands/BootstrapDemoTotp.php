<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use PragmaRX\Google2FA\Google2FA;

/**
 * One-off ops helper: enables TOTP on the shared demo@obapay.test account so
 * it can be used from any browser/device without being permanently locked
 * out by the unknown-device step-up check (there's no account-recovery flow
 * in this MVP, so a shared demo login needs 2FA to be usable cross-device).
 */
class BootstrapDemoTotp extends Command
{
    protected $signature = 'obapay:bootstrap-demo-totp {email=demo@obapay.test}';

    protected $description = 'Enables TOTP 2FA on a user account and prints the secret + current code.';

    public function handle(Google2FA $google2fa): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('User not found');
            return self::FAILURE;
        }

        $secret = $google2fa->generateSecretKey();
        $user->update(['totp_secret' => $secret, 'totp_enabled' => true]);

        $this->info('SECRET=' . $secret);
        $this->info('URL=' . $google2fa->getQRCodeUrl('ObaPay', $user->email, $secret));
        $this->info('CURRENT_CODE=' . $google2fa->getCurrentOtp($secret));

        return self::SUCCESS;
    }
}
