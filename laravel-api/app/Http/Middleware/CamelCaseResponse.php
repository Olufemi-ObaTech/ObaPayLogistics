<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The frontend was built against the original NestJS/Prisma API, which
 * serializes camelCase (originAddress, trackingNumber, ...). Eloquent models
 * serialize snake_case (matching DB columns) by default. Rather than fork
 * the frontend per-backend, translate every JSON response's keys to
 * camelCase here so both backends present the same contract.
 */
class CamelCaseResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response instanceof JsonResponse) {
            $data = $response->getData(true);
            $response->setData(self::convert($data));
        }

        return $response;
    }

    private static function convert(mixed $value): mixed
    {
        if (is_array($value)) {
            $isList = array_is_list($value);
            $result = [];
            foreach ($value as $key => $item) {
                $newKey = $isList ? $key : self::toCamel((string) $key);
                $result[$newKey] = self::convert($item);
            }

            return $result;
        }

        return $value;
    }

    private static function toCamel(string $key): string
    {
        return preg_replace_callback('/_([a-z0-9])/', fn ($m) => strtoupper($m[1]), $key);
    }
}
