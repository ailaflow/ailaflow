import { saveLicenseConfigurationRequestSchema } from '@aila/model';
import { Request } from 'express';
import { LicenseManager } from '../../configuration/license/license-manager';
import { Endpoint } from '../framework/endpoint';
import { EndpointError } from '../framework/endpoint-error';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';

export class SaveLicenseConfigurationEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/license-configuration';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly manager: LicenseManager) {}

  public async handle(req: Request): Promise<object> {
    const request = parseBody(saveLicenseConfigurationRequestSchema, req.body);
    const isValid = await this.manager.tryValidateAndSet(getEndpointAbortSignal(req), request.type, request.licenseKey);
    if (!isValid) {
      throw new EndpointError('Invalid license key', 400);
    }
    return {};
  }
}
