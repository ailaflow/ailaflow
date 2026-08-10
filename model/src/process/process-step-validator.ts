import { Definition, Sequence, Step } from 'sequential-workflow-model';
import { NotificationStep, ReturnStep, ScriptStep, StringOrVariable, TaskStep } from './process-steps';
import { VariableCachedValidator } from './variable-cached-validator';
import { FormDefinitionValidator } from './form-definition-validator';
import { ProcessDefinition } from './process-definition';
import { UserAccessExpressionParser } from '../user-access';
import { ScriptDefinitionValidator } from './script-definition-validator';

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
      case 'notification':
        this.validateNotification(step as NotificationStep, definition, errors);
        break;
      case 'return':
        this.validateReturn(step as ReturnStep, definition, errors);
        break;
    }
    return errors;
  }

  private validateScript(step: ScriptStep, errors: Record<string, string>) {
    const scriptError = ScriptDefinitionValidator.validate(step.properties.script);
    if (scriptError) {
      errors['properties.script'] = scriptError;
    }
    if (!this.sandboxNames.includes(step.properties.script.sandboxName)) {
      errors['properties.script.sandboxName'] = 'No sandbox with the specified name exists.';
    }
  }

  private validateTask(step: TaskStep, definition: ProcessDefinition, errors: Record<string, string>) {
    const formErrors = Object.values(
      FormDefinitionValidator.validate(step.properties.form, step.properties.inputVariableNames, definition, this.variableValidator)
    );
    if (formErrors.length > 0) {
      errors['properties.form'] = formErrors[0];
    }

    this.variableValidator.setErrorIfAnyVariableIsMissing(
      step.properties.inputVariableNames,
      definition,
      errors,
      'properties.inputVariableNames'
    );
    const hasMissingVariables = this.variableValidator.setErrorIfAnyVariableIsMissing(
      step.properties.outputVariableNames,
      definition,
      errors,
      'properties.outputVariableNames'
    );

    if (!hasMissingVariables) {
      for (const name of step.properties.outputVariableNames) {
        const variable = this.variableValidator.tryGet(name, definition);
        if (variable && variable.schema.schema.type !== 'array') {
          errors['properties.outputVariableNames'] = `Variable \$${name} must be of type array.`;
          break;
        }
      }
    }

    const ueError = this.validateUserExpression(step.properties.userExpression, definition);
    if (ueError) {
      errors['properties.userExpression'] = ueError;
    }
  }

  private validateNotification(step: NotificationStep, definition: ProcessDefinition, errors: Record<string, string>) {
    const ueError = this.validateUserExpression(step.properties.userExpression, definition);
    if (ueError) {
      errors['properties.userExpression'] = ueError;
    }
    const notificationError = this.validateStringOrVariable(step.properties.notification, definition);
    if (notificationError) {
      errors['properties.notification'] = notificationError;
    }
  }

  private validateReturn(step: ReturnStep, definition: ProcessDefinition, errors: Record<string, string>) {
    this.variableValidator.setErrorIfAnyVariableIsMissing(
      step.properties.outputVariableNames,
      definition,
      errors,
      'properties.outputVariableNames'
    );
  }

  private validateStringOrVariable(
    ue: StringOrVariable,
    definition: ProcessDefinition,
    stringValidator?: (value: string) => string | null
  ): string | null {
    if (ue.type === 'variable') {
      const variable = this.variableValidator.tryGet(ue.name, definition);
      if (!variable) {
        return `Variable \$${ue.name} does not exist`;
      }
      if (variable.schema.schema.type !== 'string') {
        return `Variable \$${ue.name} must be of type string`;
      }
      return null;
    }
    if (ue.type === 'string') {
      if (stringValidator) {
        return stringValidator(ue.value);
      }
      return null;
    }
    return 'Unsupported type';
  }

  private validateUserExpression(ue: StringOrVariable, definition: ProcessDefinition): string | null {
    return this.validateStringOrVariable(ue, definition, value => UserAccessExpressionParser.validate(value));
  }

  public readonly validateStep = (step: Step, _: Sequence, definition: Definition): boolean => {
    return Object.keys(this.validate(step, definition as ProcessDefinition)).length === 0;
  };
}
