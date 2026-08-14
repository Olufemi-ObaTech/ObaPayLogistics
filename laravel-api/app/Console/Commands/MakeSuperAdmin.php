<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Bootstraps the first SUPERADMIN account. There's no UI path to create one
 * (by design — a self-service "become admin" button would defeat the point),
 * so this is how the very first super admin gets promoted; every admin after
 * that is created via the Team page by an existing SUPERADMIN.
 */
class MakeSuperAdmin extends Command
{
    protected $signature = 'obapay:make-superadmin {email}';

    protected $description = 'Promotes an existing user to SUPERADMIN.';

    public function handle(): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();
        if (! $user) {
            $this->error('User not found');
            return self::FAILURE;
        }

        $user->update(['role' => 'SUPERADMIN']);
        $this->info("{$user->email} is now SUPERADMIN.");

        return self::SUCCESS;
    }
}
