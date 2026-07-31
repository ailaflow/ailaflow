import { GetMyProcessStartFormResponse } from '@aila/model';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { getAuthToken } from '../auth/auth-middleware';
import { Request } from 'express';
import { UserProcessProvider } from '../../providers/user-process-provider';

export class GetMyProcessStartFormEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-processes/:name/start-form';
  public readonly auth = true;

  public constructor(private readonly userProcessProvider: UserProcessProvider) {}

  public async handle(req: Request): Promise<GetMyProcessStartFormResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);

    const processName = String(req.params.name);
    const process = await this.userProcessProvider.tryGet(abortSignal, authToken.userName, processName);
    if (!process) {
      throw new Error('Process not found but access was granted');
    }

    return {
      form: process.definition.properties.startForm ?? null,
      startVariableSchemas: process.startVariableSchemas
    };
  }
}
