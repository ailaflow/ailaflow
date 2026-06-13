import { FormDefinition } from './form-definition';
import { ProcessDefinition } from './process-definition';
import { VariableCachedValidator } from './variable-cached-validator';

export class FormDefinitionValidator {
  public static validate(form: FormDefinition, definition: ProcessDefinition, variableValidator: VariableCachedValidator): string | null {
    if (form.inputVariables) {
      for (const v of form.inputVariables) {
        const error = v.testValue
          ? variableValidator.validateVariableValue(v.name, v.testValue, definition)
          : variableValidator.validateVariableExists(v.name, definition);
        if (error) {
          return error;
        }
      }
    }

    if (form.outputVariables) {
      for (const v of form.outputVariables) {
        const error = variableValidator.validateVariableExists(v.name, definition);
        if (error) {
          return error;
        }
      }
    }
    return null;
  }
}
