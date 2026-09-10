import { GetLicenseConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetLicenseConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/license-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly manager: KvConfigurationManager) {}

  public async handle(req: Request): Promise<GetLicenseConfigurationResponse> {
    const config = await this.manager.get(getEndpointAbortSignal(req));

    if (config.licenseType === null) {
      throw new Error('License type is not set');
    }

    return { type: config.licenseType, hasLicenseKey: Boolean(config.licenseKey) };
  }
}
