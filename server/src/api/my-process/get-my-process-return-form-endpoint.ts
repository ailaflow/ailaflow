import { GetMyProcessReturnFormResponse } from '@ailaflow/shared';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { getAuthToken } from '../auth/auth-middleware';
import { Request } from 'express';
import { UserProcessProvider } from '../../process/user-process-provider';
import { EndpointError } from '../framework/endpoint-error';

export class GetMyProcessReturnFormEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-processes/:name/return-form/:stepId';
  public readonly auth = true;

  public constructor(private readonly userProcessProvider: UserProcessProvider) {}

  public async handle(req: Request): Promise<GetMyProcessReturnFormResponse> {
    const signal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);

    const processName = String(req.params.name);
    const stepId = String(req.params.stepId);
    const process = await this.userProcessProvider.tryGet(signal, authToken.userName, processName);
    if (!process) {
      throw new EndpointError('Process not found', 400);
    }

    const form = process.forms.findOutputFormByReturnStepId(stepId);
    if (!form) {
      throw new EndpointError('Step or form not found', 400);
    }
    return {
      form
    };
  }
}
