import { Step } from 'sequential-workflow-model';
import { ScriptStep } from './process-steps';

export class ProcessStepValidator {
  public static validate(step: Step): Record<string, string> {
    const errors: Record<string, string> = {};

    if (step.name.length < 1 || step.name.length > 24) {
      errors['name'] = 'Name must be between 1 and 24 characters.';
    }

    if (step.type === 'script') {
      const scriptStep = step as ScriptStep;
      if (!scriptStep.properties.script.contents.find(content => content.path === 'package.json')) {
        errors['properties.script'] = 'Script must contain a package.json file.';
      }
    }

    return errors;
  }

  public static validateStep(step: Step): boolean {
    return Object.keys(ProcessStepValidator.validate(step)).length === 0;
  }
}
