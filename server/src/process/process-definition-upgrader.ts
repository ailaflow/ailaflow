import { PROCESS_VERSION, ProcessDefinition, TaskStep } from '@ailaflow/model';
import { DefinitionWalker } from 'sequential-workflow-model';

export class ProcessDefinitionUpgrader {
  private readonly walker = new DefinitionWalker();

  public tryUpgrade(definition: ProcessDefinition) {
    if (definition.properties.version === PROCESS_VERSION) {
      return;
    }

    this.walker.forEach(definition, step => {
      if (step.type === 'task') {
        this.upgradeTaskStep(step as TaskStep);
      }
    });

    definition.properties.version = PROCESS_VERSION;
  }

  private upgradeTaskStep(step: TaskStep) {
    if (!step.properties.title) {
      step.properties.title = {
        type: 'string',
        value: step.name
      };
    }
  }
}
