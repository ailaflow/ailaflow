import { GetLicenseStatusResponse } from '@ailaflow/shared';
import { LicenseManager } from '../../configuration/license/license-manager';
import { Endpoint } from '../framework/endpoint';

export class LicenseEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/license-status';

  public constructor(private readonly manager: LicenseManager) {}

  public async handle(): Promise<GetLicenseStatusResponse> {
    return { status: this.manager.getStatus() };
  }
}
