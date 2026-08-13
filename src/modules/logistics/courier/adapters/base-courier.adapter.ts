import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { CircuitBreaker } from '../../../../common/utils/circuit-breaker';
import { withRetry } from '../../../../common/utils/retry';
import {
  CourierOrder,
  CourierRateQuote,
  CourierShipmentResult,
  CourierTrackingEvent,
  ICourierAdapter,
} from '../interfaces/courier-adapter.interface';

/**
 * Shared HTTP + resilience plumbing for every courier partner adapter.
 * Concrete adapters only implement route support and endpoint-specific
 * request/response mapping; retries, timeouts, and circuit breaking are
 * handled once, here, so every partner integration behaves consistently
 * under the network conditions typical across African mobile/broadband links.
 */
export abstract class BaseCourierAdapter implements ICourierAdapter {
  abstract readonly code: string;
  abstract readonly name: string;
  protected abstract readonly supportedCountries: Set<string>;

  protected readonly http: AxiosInstance;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly logger: Logger;

  constructor(baseURL: string, apiKey: string) {
    this.http = axios.create({
      baseURL,
      timeout: 5000,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    this.circuitBreaker = new CircuitBreaker({ name: this.constructor.name });
    this.logger = new Logger(this.constructor.name);
  }

  supportsRoute(originCountry: string, destinationCountry: string): boolean {
    return this.supportedCountries.has(originCountry) && this.supportedCountries.has(destinationCountry);
  }

  /** Wraps a downstream call with retry (transient faults) + circuit breaker (sustained faults). */
  protected async callResilient<T>(fn: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(() =>
      withRetry(fn, {
        retries: 2,
        baseDelayMs: 300,
        shouldRetry: (err: any) => {
          // Retry on timeouts/5xx, not on 4xx (bad request won't succeed on retry).
          const status = err?.response?.status;
          return !status || status >= 500;
        },
      }),
    );
  }

  abstract getRate(order: CourierOrder): Promise<CourierRateQuote>;
  abstract createShipment(order: CourierOrder): Promise<CourierShipmentResult>;
  abstract getTrackingNumber(order: CourierOrder): Promise<string>;
  abstract getTrackingEvents(trackingNumber: string): Promise<CourierTrackingEvent[]>;
}
