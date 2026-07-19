import { Request } from 'express';
import { Endpoint } from '../endpoint';
import {
  ProcessRootValidator,
  ProcessStepValidator,
  saveProcessRequestSchema,
  SaveProcessResponse,
  VariableCachedValidator
} from '@aila/model';
import { ProcessRepository, ProcessRepositoryError } from '../../repositories/process-repository/process-repository';
import { EndpointError } from '../endpoint-error';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { parseBody } from '../parse-body';
import { Process } from '../../repositories/process-repository/process';

export class SaveProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/process';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly sandboxListQuerier: SandboxListQuerier
  ) {}

  public async handle(req: Request): Promise<SaveProcessResponse> {
    const request = parseBody(saveProcessRequestSchema, req.body);

    const { rootValidator, stepValidator } = await this.getValidators();

    try {
      let process = await this.processRepository.tryGetByName(request.name);
      if (request.insert) {
        if (process) {
          throw new EndpointError('Process already exists', 400);
        }
        process = Process.create(request, rootValidator, stepValidator);
        await this.processRepository.insert(process);
      } else {
        if (!process) {
          throw new EndpointError('Process not found', 404);
        }
        await process.update(request, rootValidator, stepValidator);
        await this.processRepository.update(process);
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
