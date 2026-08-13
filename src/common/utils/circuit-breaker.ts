import { Logger, ServiceUnavailableException } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED', // normal operation
  OPEN = 'OPEN', // failing fast, not calling downstream
  HALF_OPEN = 'HALF_OPEN', // probing whether downstream has recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // consecutive failures before opening
  resetTimeoutMs?: number; // time OPEN before trying HALF_OPEN
  name: string;
}

/**
 * Per-courier-partner circuit breaker. When a courier's API starts failing
 * repeatedly (common with regional partners under load or during outages),
 * we stop hammering it, fail fast, and let the rate-shopping module fall
 * back to the remaining healthy couriers instead of hanging every request.
 */
export class CircuitBreaker {
  private readonly logger = new Logger(`CircuitBreaker:${this.options.name}`);
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private openedAt = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed < this.resetTimeoutMs) {
        throw new ServiceUnavailableException(
          `${this.options.name} is temporarily unavailable (circuit open, retry in ${Math.ceil((this.resetTimeoutMs - elapsed) / 1000)}s)`,
        );
      }
      this.state = CircuitState.HALF_OPEN;
      this.logger.warn('Circuit half-open, probing downstream');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.log('Probe succeeded, closing circuit');
    }
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
  }

  private onFailure() {
    this.consecutiveFailures += 1;
    if (this.state === CircuitState.HALF_OPEN || this.consecutiveFailures >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.logger.error(`Circuit opened after ${this.consecutiveFailures} consecutive failures`);
    }
  }

  getState(): string {
    return this.state;
  }
}
