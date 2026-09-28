import { AgentStep, ProcessDefinition, ProcessRootValidator, ProcessStepValidator, ScriptStep } from '@ailaflow/shared';
import { DefinitionWalker } from 'sequential-workflow-model';
import { ProcessRepositoryError } from './process-repository';

export interface ProcessDefinitionScanResult {
  nSteps: number;
  nReturnSteps: number;
  nTasksSteps: number;
  sandboxNames: string[];
}

export class ProcessDefinitionWalker {
  public static validateAndScan(
    definition: ProcessDefinition,
    rootValidator: ProcessRootValidator,
    stepValidator: ProcessStepValidator
  ): ProcessDefinitionScanResult {
    if (!rootValidator.validate(definition)) {
      throw new ProcessRepositoryError('Validation failed for root');
    }

    const walker = new DefinitionWalker();
    let nSteps = 0;
    let nTasksSteps = 0;
    let nReturnSteps = 0;
    const sandboxNames = new Set<string>();

    walker.forEach(definition, (step, _, sequence) => {
      if (!stepValidator.validateStep(step, sequence, definition)) {
        throw new ProcessRepositoryError(`Validation failed for step: ${step.id}`);
      }
      if (step.type === 'task') {
        nTasksSteps++;
      } else if (step.type === 'return') {
        nReturnSteps++;
      } else if (step.type === 'script') {
        sandboxNames.add((step as ScriptStep).properties.script.sandboxName);
      } else if (step.type === 'agent') {
        sandboxNames.add((step as AgentStep).properties.sandboxName);
      }
      nSteps++;
    });

    return {
      nSteps,
      nReturnSteps,
      nTasksSteps,
      sandboxNames: [...sandboxNames]
    };
  }
}
