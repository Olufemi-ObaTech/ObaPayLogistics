<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * A stolen/leaked access token must stop working promptly once an account is
 * suspended/closed, not merely at its 15-minute expiry — re-check status on
 * every request (cached briefly to avoid a DB hit per call).
 */
class EnsureActiveUser
{
    private const CACHE_TTL_SECONDS = 30;

    public function handle(Request $request, Closure $next): Response
    {
        $userId = Auth::guard('api')->id();
        if (! $userId) {
            return $next($request);
        }

        $status = Cache::remember("user-status:{$userId}", self::CACHE_TTL_SECONDS, function () use ($userId) {
            return User::query()->where('id', $userId)->value('status');
        });

        if (! in_array($status, ['ACTIVE', 'PENDING_VERIFICATION'], true)) {
            return response()->json([
                'statusCode' => 401,
                'code' => 'UNAUTHORIZED',
                'message' => 'Account is suspended or closed',
                'path' => $request->path(),
                'timestamp' => now()->toIso8601String(),
            ], 401);
        }

        return $next($request);
    }
}
