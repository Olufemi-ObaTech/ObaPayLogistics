<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * Talks to the (mocked) DHL/Aramex/Sendy courier APIs and rate-shops across
 * them. The mock simulator lives in ../courier and speaks plain HTTP, so this
 * integration is language-agnostic — same contract the NestJS backend used.
 */
class CourierService
{
    private const CODES = ['dhl', 'aramex', 'sendy'];

    /** Requests a rate + creates a shipment on every partner, returns the cheapest that succeeded. */
    public function shop(array $order): array
    {
        $quotes = [];
        $failed = [];

        foreach (self::CODES as $code) {
            try {
                $response = Http::timeout(5)->post($this->baseUrl($code).'/rate', [
                    'weightKg' => $order['weightKg'],
                    'dimensions' => $order['dimensions'],
                    'shippingMethod' => $order['shippingMethod'],
                    'origin' => $order['origin'],
                    'destination' => $order['destination'],
                ]);

                if ($response->failed()) {
                    $failed[] = $code;
                    continue;
                }

                $body = $response->json();
                $quotes[] = [
                    'courierCode' => strtoupper($code),
                    'amount' => $body['amount'],
                    'currency' => $body['currency'],
                    'estimatedDays' => $body['estimatedDays'],
                ];
            } catch (\Throwable $e) {
                Log::warning('courier_rate_failed', ['courier' => $code, 'error' => $e->getMessage()]);
                $failed[] = $code;
            }
        }

        if (empty($quotes)) {
            throw new ServiceUnavailableHttpException(null, 'No courier partner could quote this shipment right now');
        }

        usort($quotes, fn ($a, $b) => $a['amount'] <=> $b['amount']);

        return [
            'winner' => $quotes[0],
            'allQuotes' => $quotes,
            'failedCouriers' => $failed,
        ];
    }

    public function createShipment(string $courierCode, array $order): array
    {
        $response = Http::timeout(10)->post($this->baseUrl($courierCode).'/shipments', [
            'origin' => $order['origin'],
            'destination' => $order['destination'],
            'weightKg' => $order['weightKg'],
            'dimensions' => $order['dimensions'],
            'shippingMethod' => $order['shippingMethod'],
        ]);

        if ($response->failed()) {
            throw new ServiceUnavailableHttpException(null, "Courier {$courierCode} could not be reached to schedule pickup");
        }

        return $response->json();
    }

    public function getTrackingEvents(string $courierCode, string $trackingNumber): array
    {
        $response = Http::timeout(5)->get($this->baseUrl($courierCode).'/tracking/'.$trackingNumber);
        if ($response->failed()) {
            return [];
        }

        return $response->json('events') ?? [];
    }

    private function baseUrl(string $courierCode): string
    {
        $key = strtolower($courierCode);
        return config("obapay.courier.{$key}.base");
    }
}
