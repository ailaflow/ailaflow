import { Logger } from '@aibindkit/core';

const maxRetryDelayMs = 60_000;
const initialRetryDelayMs = 500;
const maxDefaultRetryDelayMs = 8_000;

export class RetryableHttpClient {
  public constructor(
    private readonly maxRetries: number,
    private readonly logger?: Logger
  ) {}

  public async fetch(url: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (e) {
        if (init.signal?.aborted || attempt >= this.maxRetries) {
          throw e;
        }
        const delay = this.calculateDefaultRetryDelay(attempt);
        if (this.logger) {
          const error = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Request to ${url} failed: ${error}; attempt ${attempt + 1}; retrying in ${delay} ms`);
        }
        await this.wait(delay, init.signal);
        continue;
      }

      if (!this.shouldRetry(response) || attempt >= this.maxRetries) {
        return response;
      }

      await this.cancelResponseBody(response);

      const delay = this.calculateRetryDelay(response.headers, attempt);
      if (this.logger) {
        this.logger.warn(
          `Request to ${url} failed with retryable status ${response.status}; attempt ${attempt + 1}; retrying in ${delay} ms`
        );
      }
      await this.wait(delay, init.signal);
    }
  }

  private shouldRetry(response: Response): boolean {
    const shouldRetryHeader = response.headers.get('x-should-retry');
    if (shouldRetryHeader === 'true') {
      return true;
    }
    if (shouldRetryHeader === 'false') {
      return false;
    }
    return response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
  }

  private calculateRetryDelay(headers: Headers, retryCount: number): number {
    const retryAfterMs = this.readNonNegativeNumber(headers.get('retry-after-ms'));
    if (retryAfterMs !== undefined && retryAfterMs <= maxRetryDelayMs) {
      return retryAfterMs;
    }

    const retryAfter = headers.get('retry-after');
    if (retryAfter) {
      const seconds = this.readNonNegativeNumber(retryAfter);
      const delay = seconds === undefined ? Date.parse(retryAfter) - Date.now() : seconds * 1_000;
      if (delay >= 0 && delay <= maxRetryDelayMs) {
        return delay;
      }
    }
    return this.calculateDefaultRetryDelay(retryCount);
  }

  private calculateDefaultRetryDelay(retryCount: number): number {
    const delay = Math.min(initialRetryDelayMs * 2 ** retryCount, maxDefaultRetryDelayMs);
    return delay * (1 - Math.random() * 0.25);
  }

  private readNonNegativeNumber(value: string | null): number | undefined {
    if (value === null || value.trim() === '') {
      return undefined;
    }
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : undefined;
  }

  private async cancelResponseBody(response: Response): Promise<void> {
    try {
      await response.body?.cancel();
    } catch {
      // Ignore body cleanup failures because the request is already being retried.
    }
  }

  private wait(delayMs: number, abortSignal: AbortSignal | null | undefined): Promise<void> {
    if (abortSignal?.aborted) {
      return Promise.reject(abortSignal.reason);
    }
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        abortSignal?.removeEventListener('abort', onAbort);
        resolve();
      }, delayMs);
      const onAbort = () => {
        clearTimeout(timeoutId);
        reject(abortSignal?.reason);
      };
      abortSignal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
