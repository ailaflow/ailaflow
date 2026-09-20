import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import {
  ProcessRootValidator,
  ProcessStepValidator,
  saveProcessRequestSchema,
  SaveProcessResponse,
  VariableCachedValidator
} from '@ailaflow/shared';
import { ProcessRepository, ProcessRepositoryError } from '../../repositories/process/process-repository';
import { EndpointError } from '../framework/endpoint-error';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { parseBody } from '../framework/parse-request';
import { Process } from '../../repositories/process/process';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { ResourceAccess, ResourceAccessRepository } from '../../repositories/resource-access/resource-access-repository';
import { ProcessResourceId } from '../../repositories/process/process-resource-id';
import { ProcessManager } from '../../process/process-manager';

export class SaveProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly processManager: ProcessManager,
    private readonly resourceAccessRepository: ResourceAccessRepository,
    private readonly sandboxListQuerier: SandboxListQuerier
  ) {}

  public async handle(req: Request): Promise<SaveProcessResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(saveProcessRequestSchema, req.body);

    const { rootValidator, stepValidator } = await this.getValidators(signal, request.name);

    const resourceId = ProcessResourceId.create(request.name);
    const resourceAccess = ResourceAccess.createFromAccessExpression(resourceId, request.userAccessExpression);

    try {
      let process = await this.processManager.tryGetByName(signal, request.name);
      if (request.insert) {
        if (process) {
          throw new EndpointError('Process already exists', 400);
        }
        process = Process.create(request, rootValidator, stepValidator);
        await this.processRepository.insert(signal, process);
        await this.resourceAccessRepository.replace(signal, resourceAccess);
      } else {
        if (!process) {
          throw new EndpointError('Process not found', 404);
        }
        await process.update(request, rootValidator, stepValidator);
        await this.processManager.update(signal, process);
        await this.resourceAccessRepository.replace(signal, resourceAccess);
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

  private async getValidators(signal: AbortSignal, processName: string) {
    const sandboxes = await this.sandboxListQuerier.query(signal);
    const variableValidator = new VariableCachedValidator();
    return {
      rootValidator: new ProcessRootValidator(variableValidator),
      stepValidator: new ProcessStepValidator(
        processName,
        sandboxes.map(sandbox => sandbox.name),
        variableValidator
      )
    };
  }
}
