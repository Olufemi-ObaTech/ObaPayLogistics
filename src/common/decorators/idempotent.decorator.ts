import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'isIdempotent';

/**
 * Marks a route as idempotent. Combined with IdempotencyInterceptor, requires
 * clients to send an `Idempotency-Key` header. Applied to shipment creation
 * and payment endpoints so retried requests (common on flaky mobile networks)
 * never double-create a shipment or double-charge a wallet.
 */
export const Idempotent = () => SetMetadata(IDEMPOTENT_KEY, true);
