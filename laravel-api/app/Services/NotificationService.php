<?php

namespace App\Services;

/**
 * Placeholder notification channel — logs structured events. In production
 * this would dispatch to SMS/push/email providers per the user's locale and
 * preferences; kept as a single seam so that swap is a one-file change.
 */
class NotificationService
{
    public function notifyUser(string $userId, string $event, array $payload = []): void
    {
        logger()->info('notification', ['userId' => $userId, 'event' => $event, 'payload' => $payload]);
    }
}
