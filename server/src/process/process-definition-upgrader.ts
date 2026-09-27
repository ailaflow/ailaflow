import { PROCESS_VERSION, ProcessDefinition, ScriptStep } from '@ailaflow/shared';
import { DefinitionWalker } from 'sequential-workflow-model';

export class ProcessDefinitionUpgrader {
  private readonly walker = new DefinitionWalker();

  public tryUpgrade(definition: ProcessDefinition) {
    if (definition.properties.version === PROCESS_VERSION) {
      //return;
    }

    this.walker.forEach(definition, step => {
      if (step.type === 'script') {
        const s = step as ScriptStep;
        if (s.properties.script.allowedProcessNames === undefined) {
          s.properties.script.allowedProcessNames = [];
        }
      }
    });

    definition.properties.version = PROCESS_VERSION;
  }
}
