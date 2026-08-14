<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->isAdmin()) {
            return response()->json([
                'statusCode' => 403,
                'code' => 'FORBIDDEN',
                'message' => 'Admin access required',
                'path' => $request->path(),
                'timestamp' => now()->toIso8601String(),
            ], 403);
        }

        return $next($request);
    }
}
