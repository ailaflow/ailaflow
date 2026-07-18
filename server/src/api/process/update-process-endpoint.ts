import { Request } from 'express';
import { Endpoint } from '../endpoint';
import {
  ProcessRootValidator,
  ProcessStepValidator,
  updateProcessRequestSchema,
  UpdateProcessResponse,
  VariableCachedValidator
} from '@aila/model';
import { ProcessRepository } from '../../repositories/process-repository/process-repository';
import { EndpointError } from '../endpoint-error';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { parseBody } from '../parse-body';
import { Process } from '../../repositories/process-repository/process';

export class UpdateProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly sandboxListQuerier: SandboxListQuerier
  ) {}

  public async handle(req: Request): Promise<UpdateProcessResponse> {
    const request = parseBody(updateProcessRequestSchema, req.body);

    const { rootValidator, stepValidator } = await this.getValidators();

    let process: Process;
    if (request.id) {
      const existingProcess = await this.processRepository.tryGetById(request.id);
      if (!existingProcess) {
        throw new EndpointError('Process not found', 404);
      }
      process = existingProcess;
      await process.update(request, rootValidator, stepValidator);
      await this.processRepository.update(process);
    } else {
      process = await Process.create(request, rootValidator, stepValidator);
      await this.processRepository.insert(process);
    }

    return {
      id: process.id
    };
  }

  private async getValidators() {
    const sandboxes = await this.sandboxListQuerier.query();
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
