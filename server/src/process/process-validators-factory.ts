import { ProcessRootValidator, ProcessStepValidator, VariableCachedValidator } from '@ailaflow/shared';
import { SandboxListQuerier } from '../queriers/sandbox-list/sandbox-list-querier';

export interface ProcessValidators {
  rootValidator: ProcessRootValidator;
  stepValidator: ProcessStepValidator;
}

export class ProcessValidatorsFactory {
  public constructor(private readonly sandboxListQuerier: SandboxListQuerier) {}

  public async create(signal: AbortSignal, processName: string): Promise<ProcessValidators> {
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
