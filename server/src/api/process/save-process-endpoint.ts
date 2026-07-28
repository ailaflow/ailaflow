import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import {
  ProcessRootValidator,
  ProcessStepValidator,
  saveProcessRequestSchema,
  SaveProcessResponse,
  VariableCachedValidator
} from '@aila/model';
import { ProcessRepository, ProcessRepositoryError } from '../../repositories/process/process-repository';
import { EndpointError } from '../framework/endpoint-error';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { parseBody } from '../framework/parse-body';
import { Process } from '../../repositories/process/process';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { ResourceAccess, ResourceAccessRepository } from '../../repositories/resource-access/resource-access-repository';
import { ProcessResourceId } from '../../repositories/process/process-resource-id';

export class SaveProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly resourceAccessRepository: ResourceAccessRepository,
    private readonly sandboxListQuerier: SandboxListQuerier
  ) {}

  public async handle(req: Request): Promise<SaveProcessResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(saveProcessRequestSchema, req.body);

    const { rootValidator, stepValidator } = await this.getValidators(abortSignal);

    const resourceId = ProcessResourceId.create(request.name);
    const resourceAccess = ResourceAccess.createFromAccessExpression(resourceId, request.userAccessExpression);

    try {
      let process = await this.processRepository.tryGetByName(abortSignal, request.name);
      if (request.insert) {
        if (process) {
          throw new EndpointError('Process already exists', 400);
        }
        process = Process.create(request, rootValidator, stepValidator);
        await this.processRepository.insert(abortSignal, process);
      } else {
        if (!process) {
          throw new EndpointError('Process not found', 404);
        }
        await process.update(request, rootValidator, stepValidator);
        await this.processRepository.update(abortSignal, process);
        await this.resourceAccessRepository.replace(abortSignal, resourceAccess);
      }
    } catch (e) {
      if (e instanceof ProcessRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {
      name: request.name
    };
  }

  private async getValidators(abortSignal: AbortSignal) {
    const sandboxes = await this.sandboxListQuerier.query(abortSignal);
    const variableValidator = new VariableCachedValidator();
    return {
      rootValidator: new ProcessRootValidator(variableValidator),
      stepValidator: new ProcessStepValidator(
        sandboxes.map(sandbox => sandbox.name),
        variableValidator
      )
    };
  }
}
