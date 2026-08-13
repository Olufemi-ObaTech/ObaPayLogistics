<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyRecord;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Idempotency handling for shipment creation, payment, and transfer endpoints.
 *
 * Flow:
 *  1. Client sends `Idempotency-Key` header (a client-generated UUID per logical action).
 *  2. A cache lock prevents two concurrent requests with the same key from both executing.
 *  3. IdempotencyRecord persists the *result* of the first successful call, so a
 *     retried request (e.g. after a mobile network drop) gets back the exact
 *     same response instead of creating a duplicate shipment or double-charging.
 */
class Idempotent
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');
        if (! $idempotencyKey) {
            return response()->json([
                'statusCode' => 400,
                'code' => 'BadRequestException',
                'message' => 'Idempotency-Key header is required for this operation',
                'path' => $request->path(),
                'timestamp' => now()->toIso8601String(),
            ], 400);
        }

        $userId = Auth::guard('api')->id() ?? 'anonymous';
        $compositeKey = "idem:{$userId}:{$idempotencyKey}";

        $existing = IdempotencyRecord::query()->where('key', $compositeKey)->first();
        if ($existing && $existing->completed_at) {
            return response()->json($existing->response_body, $existing->status_code ?? 200);
        }

        $lock = Cache::lock("idem-lock:{$compositeKey}", 15);
        if (! $lock->get()) {
            return response()->json([
                'statusCode' => 409,
                'code' => 'ConflictException',
                'message' => 'A request with this Idempotency-Key is already being processed',
                'path' => $request->path(),
                'timestamp' => now()->toIso8601String(),
            ], 409);
        }

        try {
            if (! $existing) {
                IdempotencyRecord::query()->create([
                    'key' => $compositeKey,
                    'user_id' => $userId,
                    'request_path' => $request->path(),
                ]);
            }

            $response = $next($request);

            if ($response->isSuccessful()) {
                IdempotencyRecord::query()->where('key', $compositeKey)->update([
                    'response_body' => json_decode($response->getContent(), true),
                    'status_code' => $response->getStatusCode(),
                    'completed_at' => now(),
                ]);
            } else {
                // Allow retries on failure by removing the in-progress record.
                IdempotencyRecord::query()->where('key', $compositeKey)->whereNull('completed_at')->delete();
            }

            return $response;
        } catch (\Throwable $e) {
            IdempotencyRecord::query()->where('key', $compositeKey)->whereNull('completed_at')->delete();
            throw $e;
        } finally {
            $lock->release();
        }
    }
}
