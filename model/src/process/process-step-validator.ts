import { Definition, Sequence, Step } from 'sequential-workflow-model';
import { ReturnStep, ScriptStep, TaskStep } from './process-steps';
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
    switch (step.type) {
      case 'script':
        this.validateScript(step as ScriptStep, errors);
        break;
      case 'task':
        this.validateTask(step as TaskStep, definition, errors);
        break;
      case 'return':
        this.validateReturn(step as ReturnStep, definition, errors);
        break;
    }
    return errors;
  }

  private validateScript(step: ScriptStep, errors: Record<string, string>) {
    if (!step.properties.script.contents.find(content => content.path === 'package.json')) {
      errors['properties.script'] = 'Script must contain a package.json file.';
    }
    if (!this.sandboxNames.includes(step.properties.script.sandboxName)) {
      errors['properties.script.sandboxName'] = 'No sandbox with the specified name exists.';
    }
  }

  private validateTask(step: TaskStep, definition: ProcessDefinition, errors: Record<string, string>) {
    const e = Object.values(
      FormDefinitionValidator.validate(step.properties.form, step.properties.inputVariableNames, definition, this.variableValidator)
    );
    if (e.length > 0) {
      errors['properties.form'] = e[0];
    }

    this.variableValidator.setErrorIfAnyVariableIsMissing(
      step.properties.inputVariableNames,
      definition,
      errors,
      'properties.inputVariableNames'
    );
    this.variableValidator.setErrorIfAnyVariableIsMissing(
      step.properties.outputVariableNames,
      definition,
      errors,
      'properties.outputVariableNames'
    );
  }

  private validateReturn(step: ReturnStep, definition: ProcessDefinition, errors: Record<string, string>) {
    this.variableValidator.setErrorIfAnyVariableIsMissing(
      step.properties.outputVariableNames,
      definition,
      errors,
      'properties.outputVariableNames'
    );
  }

  public readonly validateStep = (step: Step, _: Sequence, definition: Definition): boolean => {
    return Object.keys(this.validate(step, definition as ProcessDefinition)).length === 0;
  };
}
