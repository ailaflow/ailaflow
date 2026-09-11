import { CanInstallResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { Installer } from '../../install/installer';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class CanInstallEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/install/can-install';

  public constructor(private readonly installer: Installer) {}

  public async handle(req: Request): Promise<CanInstallResponse> {
    const canInstall = await this.installer.canInstall(getEndpointAbortSignal(req));
    return { canInstall };
  }
}
