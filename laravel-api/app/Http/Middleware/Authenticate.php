<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

/**
 * This API has no web/session login route to redirect to — it's JWT-only.
 * The base middleware falls back to `route('login')` for requests that don't
 * look like they "expect JSON" (e.g. no Accept header, as many plain HTTP
 * clients send), which throws RouteNotFoundException and surfaces as a 500
 * instead of the intended 401. Never redirect; always let it fall through to
 * an AuthenticationException.
 */
class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        return null;
    }
}
