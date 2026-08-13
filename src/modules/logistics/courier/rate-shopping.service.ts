import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../common/redis/redis.service';
import { ICourierAdapter, CourierOrder, CourierRateQuote } from './interfaces/courier-adapter.interface';
import { COURIER_ADAPTERS } from './courier.constants';

export type RateShoppingStrategy = 'CHEAPEST' | 'FASTEST';

export interface RateShoppingResult {
  winner: CourierRateQuote;
  allQuotes: CourierRateQuote[];
  failedCouriers: string[];
}

/**
 * Queries every courier partner that services the requested route in parallel,
 * and picks the winner by the requested strategy (cheapest by default, or
 * fastest ETA). Partners that time out, error, or have an open circuit are
 * simply excluded rather than failing the whole request — as long as at
 * least one courier responds, the user gets a rate.
 */
@Injectable()
export class RateShoppingService {
  private readonly logger = new Logger(RateShoppingService.name);

  constructor(
    @Inject(COURIER_ADAPTERS) private readonly adapters: ICourierAdapter[],
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async shop(order: CourierOrder, strategy: RateShoppingStrategy = 'CHEAPEST'): Promise<RateShoppingResult> {
    const cacheKey = this.cacheKey(order, strategy);
    const cached = await this.redis.getJson<RateShoppingResult>(cacheKey);
    if (cached) {
      this.logger.debug({ msg: 'rate_shopping_cache_hit', shipmentId: order.shipmentId });
      return cached;
    }

    const eligible = this.adapters.filter((a) => a.supportsRoute(order.origin.country, order.destination.country));
    if (eligible.length === 0) {
      throw new ServiceUnavailableException('No courier partner services this route yet');
    }

    const settled = await Promise.allSettled(eligible.map((adapter) => adapter.getRate(order)));

    const quotes: CourierRateQuote[] = [];
    const failedCouriers: string[] = [];
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        quotes.push(result.value);
      } else {
        failedCouriers.push(eligible[i].code);
        this.logger.warn({ msg: 'courier_rate_failed', courier: eligible[i].code, error: (result.reason as Error)?.message });
      }
    });

    if (quotes.length === 0) {
      throw new ServiceUnavailableException('All courier partners are currently unavailable for rate quotes');
    }

    const winner =
      strategy === 'FASTEST'
        ? quotes.reduce((best, q) => (q.estimatedDays < best.estimatedDays ? q : best))
        : quotes.reduce((best, q) => (q.amount < best.amount ? q : best));

    const result: RateShoppingResult = { winner, allQuotes: quotes, failedCouriers };
    await this.redis.setJson(cacheKey, result, 120); // short TTL: rates drift, and quotes must stay fresh for payment confirmation
    return result;
  }

  getAdapterByCode(code: string): ICourierAdapter {
    const adapter = this.adapters.find((a) => a.code === code);
    if (!adapter) throw new ServiceUnavailableException(`Unknown courier partner: ${code}`);
    return adapter;
  }

  private cacheKey(order: CourierOrder, strategy: RateShoppingStrategy): string {
    const { length, width, height } = order.dimensions;
    return `rate-shop:${strategy}:${order.origin.country}:${order.destination.country}:${order.weightKg}:${length}x${width}x${height}:${order.shippingMethod}`;
  }
}
