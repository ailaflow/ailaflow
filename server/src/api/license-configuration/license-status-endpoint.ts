import { GetLicenseStatusResponse } from '@ailaflow/shared';
import { LicenseManager } from '../../configuration/license/license-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { Request } from 'express';
import { VersionProvider } from '../../core/version-provider';

export class LicenseEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/license-status';
  public readonly auth = true;

  public constructor(
    private readonly manager: LicenseManager,
    private readonly versionProvider: VersionProvider
  ) {}

  public async handle(req: Request): Promise<GetLicenseStatusResponse> {
    const signal = getEndpointAbortSignal(req);
    const instanceId = await this.manager.getInstanceId(signal);
    const version = this.versionProvider.get();

    const response: GetLicenseStatusResponse = {
      instanceId,
      version
    };
    const status = this.manager.getStatus();
    if (status) {
      response.type = status.type;
      response.validationError = status.validationResult.validationError;
      response.checkedAt = status.checkedAt;
      response.canUpgrade = status.validationResult.canUpgrade;
    }
    return response;
  }
}
