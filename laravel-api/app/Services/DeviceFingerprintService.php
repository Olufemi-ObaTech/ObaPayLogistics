<?php

namespace App\Services;

use App\Models\DeviceFingerprint;

/**
 * Tracks devices used to access a user's account. New/unrecognized devices
 * trigger step-up verification (2FA) even if the JWT is valid, which is the
 * standard fintech defense against stolen-token account takeover.
 */
class DeviceFingerprintService
{
    public function hash(string $rawFingerprint): string
    {
        return hash('sha256', $rawFingerprint);
    }

    public function isKnownDevice(string $userId, string $rawFingerprint): bool
    {
        $fingerprint = $this->hash($rawFingerprint);

        return DeviceFingerprint::query()
            ->where('user_id', $userId)
            ->where('fingerprint', $fingerprint)
            ->where('trusted', true)
            ->exists();
    }

    public function recordDevice(string $userId, string $rawFingerprint, ?string $userAgent, ?string $ip, bool $trusted = false): DeviceFingerprint
    {
        $fingerprint = $this->hash($rawFingerprint);

        $device = DeviceFingerprint::query()
            ->firstOrNew(['user_id' => $userId, 'fingerprint' => $fingerprint]);

        // `trusted` is only ever set on first insert — an existing record's
        // trusted flag is never silently overwritten by a later call.
        if (! $device->exists) {
            $device->trusted = $trusted;
        }

        $device->last_seen_at = now();
        $device->last_seen_ip = $ip;
        $device->user_agent = $userAgent;
        $device->save();

        return $device;
    }
}
