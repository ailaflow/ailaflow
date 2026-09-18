import { Definition, Sequence, Step } from 'sequential-workflow-model';
import { AgentStep, BranchStep, NotificationStep, ReturnStep, ScriptStep, StringOrVariable, TaskStep } from './process-steps';
import { VariableCachedValidator } from './variable-cached-validator';
import { FormDefinitionValidator } from './form-definition-validator';
import { ProcessDefinition } from './process-definition';
import { UserAccessExpressionParser } from '../user-access';
import { ScriptDefinitionValidator } from './script-definition-validator';
import { TaskStepValidator } from './task-step-validator';
import { TaskDeadlinePresetValidator } from '../task';
import { TaskCompletionMetadataSchemaValidator } from '../task/task-completion-metadata';

export class ProcessStepValidator {
  public constructor(
    private readonly sandboxNames: string[],
    private readonly variableValidator: VariableCachedValidator
  ) {}

  public validateName(name: string): string | null {
    if (name.length < 1 || name.length > 32) {
      return 'Name must be between 1 and 32 characters.';
    }
    return null;
  }

  public validate(step: Step, definition: ProcessDefinition): Record<string, string> {
    const errors: Record<string, string> = {};
    const nameError = this.validateName(step.name);
    if (nameError) {
      errors['name'] = nameError;
    }
    switch (step.type) {
      case 'script':
        this.validateScript(step as ScriptStep, errors);
        break;
      case 'agent':
        this.validateAgent(step as AgentStep, definition, errors);
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
      case 'branch':
        this.validateBranch(step as BranchStep, definition, errors);
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

  private validateAgent(step: AgentStep, definition: ProcessDefinition, errors: Record<string, string>) {
    const promptError = this.validateStringOrVariable(step.properties.prompt, definition);
    if (promptError) {
      errors['properties.prompt'] = promptError;
    }

    const avError = this.variableValidator.validateVariablesReference(step.properties.allowedVariableNames, definition);
    if (avError) {
      errors['properties.allowedVariableNames'] = avError;
    }

    if (!this.sandboxNames.includes(step.properties.sandboxName)) {
      errors['properties.sandboxName'] = 'No sandbox with the specified name exists.';
    }
  }

  private validateTask(step: TaskStep, definition: ProcessDefinition, errors: Record<string, string>) {
    const formErrors = Object.values(
      FormDefinitionValidator.validate(step.properties.form, step.properties.inputVariableNames, definition, this.variableValidator)
    );
    if (formErrors.length > 0) {
      errors['properties.form'] = formErrors[0];
    }

    const titleError = this.validateStringOrVariable(step.properties.title, definition);
    if (titleError) {
      errors['properties.title'] = titleError;
    }

    const ivError = this.variableValidator.validateVariablesReference(step.properties.inputVariableNames, definition);
    if (ivError) {
      errors['properties.inputVariableNames'] = ivError;
    }

    const ovError = TaskStepValidator.validateOutputVariables(this.variableValidator, definition, step.properties.outputVariableNames);
    if (ovError) {
      errors['properties.outputVariableNames'] = ovError;
    }

    const ueError = this.validateUserExpression(step.properties.userExpression, definition);
    if (ueError) {
      errors['properties.userExpression'] = ueError;
    }

    const deadlineError = step.properties.deadline
      ? this.validateStringOrVariable(step.properties.deadline, definition, preset => TaskDeadlinePresetValidator.validate(preset))
      : null;
    if (deadlineError) {
      errors['properties.deadline'] = deadlineError;
    }

    if (step.properties.metadataVariableName) {
      const variable = this.variableValidator.tryGet(step.properties.metadataVariableName, definition);
      let error: string | null = null;
      if (variable) {
        error = TaskCompletionMetadataSchemaValidator.validate(variable.schema);
      } else {
        error = 'No variable with the specified name exists';
      }
      if (error) {
        errors['properties.metadataVariableName'] = error;
      }
    }

    const metadataVariableError = step.properties.metadataVariableName
      ? this.variableValidator.validateVariableType(step.properties.metadataVariableName, 'object', definition)
      : null;
    if (metadataVariableError) {
      errors['properties.metadataVariableName'] = metadataVariableError;
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
    const ovError = this.variableValidator.validateVariablesReference(step.properties.outputVariableNames, definition);
    if (ovError) {
      errors['properties.outputVariableNames'] = ovError;
    }
  }

  private validateBranch(step: BranchStep, definition: ProcessDefinition, errors: Record<string, string>) {
    const selectorError = this.variableValidator.validateVariableType(step.properties.branchSelectorVariableName, 'string', definition);
    if (selectorError) {
      errors['properties.branchSelectorVariableName'] = selectorError;
    }
  }

  private validateStringOrVariable(
    ue: StringOrVariable,
    definition: ProcessDefinition,
    stringValidator?: (value: string) => string | null
  ): string | null {
    if (ue.type === 'variable') {
      return this.variableValidator.validateVariableType(ue.name, 'string', definition);
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
