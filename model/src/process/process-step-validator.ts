import { Definition, Sequence, Step } from 'sequential-workflow-model';
import { NotificationStep, ReturnStep, ScriptStep, TaskStep } from './process-steps';
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
        this.validateNotification(step as NotificationStep, errors);
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

    const userExpressionError = UserAccessExpressionParser.validate(step.properties.userExpression);
    if (userExpressionError) {
      errors['properties.userExpression'] = userExpressionError;
    }
  }

  private validateNotification(step: NotificationStep, errors: Record<string, string>) {
    const userExpressionError = UserAccessExpressionParser.validate(step.properties.userExpression);
    if (userExpressionError) {
      errors['properties.userExpression'] = userExpressionError;
    }

    if (step.properties.notification.length < 1) {
      errors['properties.notification'] = 'Notification must not be empty.';
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

  public readonly validateStep = (step: Step, _: Sequence, definition: Definition): boolean => {
    return Object.keys(this.validate(step, definition as ProcessDefinition)).length === 0;
  };
}
