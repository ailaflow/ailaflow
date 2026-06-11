import { Step } from 'sequential-workflow-model';
import { ScriptStep } from './process-steps';

export class ProcessStepValidator {
  public constructor(private readonly sandboxNames: string[]) {}

  public validate(step: Step): Record<string, string> {
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

    return errors;
  }

  public readonly validateStep = (step: Step): boolean => {
    return Object.keys(this.validate(step)).length === 0;
  };
}
