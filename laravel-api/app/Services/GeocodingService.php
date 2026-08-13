<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class GeocodingService
{
    /** Validates the address is resolvable; failure here is a hard stop (bad address). */
    public function validateAndGeocode(array $address): array
    {
        try {
            $response = Http::timeout(5)->post(config('obapay.geocoding_api_base'), [
                'line1' => $address['line1'] ?? null,
                'city' => $address['city'] ?? null,
                'country' => $address['country'] ?? null,
            ]);
        } catch (\Throwable $e) {
            throw new BadRequestHttpException('Address could not be validated: geocoding service unavailable');
        }

        if ($response->failed()) {
            throw new BadRequestHttpException('Address could not be validated: '.($response->json('message') ?? 'invalid address'));
        }

        return $response->json();
    }
}
