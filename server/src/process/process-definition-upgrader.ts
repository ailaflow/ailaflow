import { PROCESS_VERSION, ProcessDefinition } from '@ailaflow/shared';
import { DefinitionWalker } from 'sequential-workflow-model';

export class ProcessDefinitionUpgrader {
  private readonly walker = new DefinitionWalker();

  public tryUpgrade(definition: ProcessDefinition) {
    if (definition.properties.version === PROCESS_VERSION) {
      return;
    }

    this.walker.forEach(definition, step => {
      // if (step.type === 'return') {
      //   this.upgradeReturnStep(step as ReturnStep);
      // }
    });

    definition.properties.version = PROCESS_VERSION;
  }
}
