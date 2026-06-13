import { Definition, Sequence, Step } from 'sequential-workflow-model';
import { ScriptStep, TaskStep } from './process-steps';
import { VariableCachedValidator } from './variable-cached-validator';
import { FormDefinitionValidator } from './form-definition-validator';
import { ProcessDefinition } from './process-definition';

export class ProcessStepValidator {
  public constructor(
    private readonly sandboxNames: string[],
    private readonly variableValidator: VariableCachedValidator
  ) {}

  public validate(step: Step, definition: ProcessDefinition): Record<string, string> {
    const errors: Record<string, string> = {};

    if (step.name.length < 1 || step.name.length > 24) {
      errors['name'] = 'Name must be between 1 and 24 characters.';
    }

    if (step.type === 'script') {
      const scriptStep = step as ScriptStep;
      if (!scriptStep.properties.script.contents.find(content => content.path === 'package.json')) {
        errors['properties.script'] = 'Script must contain a package.json file.';
      }
      if (!this.sandboxNames.includes(scriptStep.properties.script.sandboxName)) {
        errors['properties.sandboxName'] = 'No sandbox with the specified name exists.';
      }
    }

    if (step.type === 'task') {
      const taskStep = step as TaskStep;
      const e = Object.values(FormDefinitionValidator.validate(taskStep.properties.form, definition, this.variableValidator));
      if (e.length > 0) {
        errors['properties.form'] = e[0];
      }
    }

    return errors;
  }

  public readonly validateStep = (step: Step, _: Sequence, definition: Definition): boolean => {
    return Object.keys(this.validate(step, definition as ProcessDefinition)).length === 0;
  };
}
