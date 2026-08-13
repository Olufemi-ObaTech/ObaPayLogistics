<?php

use App\Http\Middleware\Authenticate;
use App\Http\Middleware\CamelCaseResponse;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\Idempotent;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth' => Authenticate::class,
            'jwt.active' => EnsureActiveUser::class,
            'idempotent' => Idempotent::class,
        ]);

        $middleware->api(
            prepend: [\Illuminate\Http\Middleware\HandleCors::class],
            append: [CamelCaseResponse::class],
        );

        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Central error handler: normalizes all thrown errors into a consistent
        // JSON shape and logs them in structured form, mirroring the API's
        // previous NestJS AllExceptionsFilter behavior.
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = 500;
            $code = 'INTERNAL_ERROR';
            $message = 'Internal server error';

            if ($e instanceof ValidationException) {
                $status = 422;
                $code = 'VALIDATION_ERROR';
                $message = $e->errors();
            } elseif ($e instanceof AuthenticationException) {
                $status = 401;
                $code = 'UNAUTHORIZED';
                $message = 'Unauthenticated';
            } elseif ($e instanceof ModelNotFoundException) {
                $status = 404;
                $code = 'NOT_FOUND';
                $message = 'Resource not found';
            } elseif ($e instanceof HttpExceptionInterface) {
                $status = $e->getStatusCode();
                $code = class_basename($e);
                $message = $e->getMessage() ?: $code;
            }

            Log::error('unhandled_exception', [
                'path' => $request->path(),
                'method' => $request->method(),
                'status' => $status,
                'code' => $code,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'statusCode' => $status,
                'code' => $code,
                'message' => $message,
                'path' => $request->path(),
                'timestamp' => now()->toIso8601String(),
            ], $status);
        });
    })->create();
