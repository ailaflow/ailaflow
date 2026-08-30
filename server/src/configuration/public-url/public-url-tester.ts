import { healthResponseSchema, TestPublicUrlResponse } from '@aila/model';

const TIMEOUT = 5_000;

export class PublicUrlTester {
  public async test(abortSignal: AbortSignal, publicUrl: string): Promise<TestPublicUrlResponse> {
    const timeoutSignal = AbortSignal.timeout(TIMEOUT);
    const signal = AbortSignal.any([abortSignal, timeoutSignal]);
    const healthUrl = `${publicUrl.replace(/\/+$/, '')}/health`;

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal
      });
      if (!response.ok) {
        return unavailable(publicUrl, `Health endpoint returned HTTP ${response.status}.`);
      }

      const result = healthResponseSchema.safeParse(await response.json());
      return result.success
        ? { publicUrl, isAvailable: true, error: null }
        : unavailable(publicUrl, 'Health endpoint returned an unexpected response.');
    } catch (error) {
      if (abortSignal.aborted) {
        throw error;
      }
      return timeoutSignal.aborted
        ? unavailable(publicUrl, 'Health endpoint request timed out.')
        : unavailable(publicUrl, 'Health endpoint could not be reached.');
    }
  }
}

function unavailable(publicUrl: string, error: string): TestPublicUrlResponse {
  return { publicUrl, isAvailable: false, error };
}
