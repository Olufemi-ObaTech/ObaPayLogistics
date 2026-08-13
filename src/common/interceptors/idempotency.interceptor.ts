import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { finalize, switchMap, tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

/**
 * Idempotency handling for shipment creation and payment endpoints.
 *
 * Flow:
 *  1. Client sends `Idempotency-Key` header (a client-generated UUID per logical action).
 *  2. Redis lock prevents two concurrent requests with the same key from both executing.
 *  3. Postgres IdempotencyRecord persists the *result* of the first successful call,
 *     so a retried request (e.g. after a mobile network drop) gets back the exact
 *     same response instead of creating a duplicate shipment or double-charging.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isIdempotent = this.reflector.get<boolean>(IDEMPOTENT_KEY, context.getHandler());
    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required for this operation');
    }

    const userId = request.user?.id ?? 'anonymous';
    const compositeKey = `idem:${userId}:${idempotencyKey}`;
    const lockKey = `idem-lock:${compositeKey}`;

    return from(this.handle(compositeKey, lockKey, userId, request.originalUrl, next)).pipe(switchMap((obs) => obs));
  }

  private async handle(
    compositeKey: string,
    lockKey: string,
    userId: string,
    requestPath: string,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { key: compositeKey } });
    if (existing?.completedAt) {
      // Replay the stored result instead of re-executing side effects.
      return of(existing.responseBody);
    }

    const acquired = await this.redis.acquireLock(lockKey, 15_000);
    if (!acquired) {
      throw new ConflictException('A request with this Idempotency-Key is already being processed');
    }

    try {
      if (!existing) {
        await this.prisma.idempotencyRecord.create({
          data: { key: compositeKey, userId, requestPath },
        });
      }

      return next.handle().pipe(
        tap({
          next: async (responseBody) => {
            await this.prisma.idempotencyRecord.update({
              where: { key: compositeKey },
              data: { responseBody: responseBody as any, statusCode: 200, completedAt: new Date() },
            });
          },
          error: async () => {
            // Allow retries on failure by removing the in-progress record.
            await this.prisma.idempotencyRecord.deleteMany({ where: { key: compositeKey, completedAt: null } });
          },
        }),
        finalize(() => {
          void this.redis.release(lockKey);
        }),
      );
    } catch (err) {
      await this.redis.release(lockKey);
      throw err;
    }
  }
}
