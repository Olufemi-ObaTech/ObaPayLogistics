import { Logger } from '@nestjs/common';

const logger = new Logger('RetryUtil');

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Called between attempts; return false to stop retrying early. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
}

/**
 * Exponential backoff with jitter. Used for courier partner API calls, which are
 * expected to time out or flake intermittently on unreliable regional networks.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 250, maxDelayMs = 4000, shouldRetry = () => true } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === retries + 1;
      if (isLastAttempt || !shouldRetry(err, attempt)) {
        break;
      }
      const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * exponential * 0.3;
      const delay = exponential + jitter;
      logger.warn(`Attempt ${attempt} failed (${(err as Error)?.message}), retrying in ${Math.round(delay)}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
