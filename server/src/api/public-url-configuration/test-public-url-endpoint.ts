import { testPublicUrlRequestSchema, TestPublicUrlResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { PublicUrlTester } from '../../configuration/public-url/public-url-tester';
import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';

export class TestPublicUrlEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/public-url-configuration/test';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly manager: KvConfigurationManager,
    private readonly tester: PublicUrlTester
  ) {}

  public async handle(req: Request): Promise<TestPublicUrlResponse> {
    const request = parseBody(testPublicUrlRequestSchema, req.body);
    const signal = getEndpointAbortSignal(req);
    const publicUrl = request.publicUrl ?? (await this.manager.get(signal)).publicUrl;
    if (!publicUrl) {
      return { publicUrl: null, isAvailable: false, error: 'Public URL is not configured.' };
    }
    return this.tester.test(signal, publicUrl);
  }
}
