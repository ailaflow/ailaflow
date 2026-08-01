import type { GetTaskVariableValueResponse } from '@aila/model';
import { Endpoint } from '../framework/endpoint';
import { Request } from 'express';
import { PersistedExecutionRepository } from '../../repositories/persisted-execution/persisted-execution-repository';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class GetTaskVariableValueEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-tasks/variable-value';
  public readonly auth = true;

  public constructor(private readonly persistedExecutionRepository: PersistedExecutionRepository) {}

  public async handle(req: Request): Promise<GetTaskVariableValueResponse> {
    const abortSignal = getEndpointAbortSignal(req);

    const pe = await this.persistedExecutionRepository.tryGet(abortSignal, req.body.executionId);
    if (!pe) {
      throw new EndpointError('Cannot find the execution', 404);
    }

    const values = pe.state.context.globalState.variableValues;
    const value = values[req.body.variableName];
    if (value === undefined) {
      throw new EndpointError('Cannot find variable', 404);
    }

    return {
      value
    };
  }
}
