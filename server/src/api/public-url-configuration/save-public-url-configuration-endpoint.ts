import { savePublicUrlConfigurationRequestSchema, SavePublicUrlConfigurationResponse } from '@ailaflow/model';
import { Request } from 'express';
import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { KvConfigurationError } from '../../repositories/configuration/kv/kv-configuration';
import { EndpointError } from '../framework/endpoint-error';

export class SavePublicUrlConfigurationEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/public-url-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly manager: KvConfigurationManager) {}

  public async handle(req: Request): Promise<SavePublicUrlConfigurationResponse> {
    const request = parseBody(savePublicUrlConfigurationRequestSchema, req.body);
    const abortSignal = getEndpointAbortSignal(req);
    const config = await this.manager.get(abortSignal);

    try {
      config.setPublicUrl(request.publicUrl);
    } catch (e) {
      if (e instanceof KvConfigurationError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    await this.manager.update(abortSignal, config);
    return { publicUrl: config.publicUrl };
  }
}
