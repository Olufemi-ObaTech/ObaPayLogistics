<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Durable replacement for an in-process setTimeout: run continuously via
// `php artisan schedule:work` (see Procfile) rather than relying on system cron,
// since sub-minute frequencies need the scheduler process to stay alive.
Schedule::command('obapay:sweep-customs-clearance')->everyThirtySeconds()->withoutOverlapping();
