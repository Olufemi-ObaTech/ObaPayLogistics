<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Global default: 100 requests/min per client. Auth-sensitive routes
        // (login, refresh, 2FA) use the tighter named limiters below instead.
        RateLimiter::for('api', function ($request) {
            return Limit::perMinute((int) env('THROTTLE_LIMIT', 100))->by($request->user()?->id ?: $request->ip());
        });

        // Brute-force defense on credential/step-up endpoints.
        RateLimiter::for('login', function ($request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // 6-digit TOTP codes have only 1,000,000 possibilities; without a tight
        // throttle here an attacker could brute-force a code within its 30s window.
        RateLimiter::for('twofa', function ($request) {
            return Limit::perMinute(5)->by(optional($request->user())->id ?: $request->ip());
        });
    }
}
