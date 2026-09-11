import { Request } from 'express';
import { installRequestSchema, InstallResponse } from '@ailaflow/shared';
import { Installer } from '../../install/installer';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class InstallEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/install';

  public constructor(private readonly installer: Installer) {}

  public async handle(req: Request): Promise<InstallResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(installRequestSchema, req.body);

    const error = await this.installer.install(
      abortSignal,
      request.rootUserName,
      request.rootPassword,
      request.licenseType,
      request.licenseKey
    );
    if (error !== null) {
      throw new EndpointError(error, 400);
    }

    return {};
  }
}
