import { FormDefinition, ReturnStep } from '@ailaflow/shared';
import { Process } from './process';
import { DefinitionWalker } from 'sequential-workflow-model';

export class ProcessForms {
  private readonly walker = new DefinitionWalker();

  public constructor(private readonly process: Process) {}

  public findOutputFormByReturnStepId(id: string): FormDefinition | null {
    const step = this.walker.findById(this.process.definition, id);
    if (step && step.type === 'return') {
      const returnStep = step as ReturnStep;
      if (returnStep.properties.outputForm) {
        return returnStep.properties.outputForm;
      }
    }
    return null;
  }
}
