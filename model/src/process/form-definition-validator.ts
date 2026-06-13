import { FormDefinition } from './form-definition';
import { ProcessDefinition } from './process-definition';
import { VariableCachedValidator } from './variable-cached-validator';

export class FormDefinitionValidator {
  public static validate(
    form: FormDefinition,
    definition: ProcessDefinition,
    variableValidator: VariableCachedValidator
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    if (form.inputVariables) {
      for (let i = 0; i < form.inputVariables.length; i++) {
        const v = form.inputVariables[i];
        let error: string | null = null;
        if (v.testValue) {
          try {
            const json = JSON.parse(v.testValue);
            error = variableValidator.validateVariableValue(v.name, json, definition);
          } catch {
            error = `Test value is not valid JSON`;
          }
        } else {
          error = variableValidator.validateVariableExists(v.name, definition);
        }
        if (error) {
          errors[`inputVariables.${i}`] = error;
        }
      }
    }

    if (form.outputVariables) {
      for (let i = 0; i < form.outputVariables.length; i++) {
        const v = form.outputVariables[i];
        const error = variableValidator.validateVariableExists(v.name, definition);
        if (error) {
          errors[`outputVariables.${i}`] = error;
        }
      }
    }
    return errors;
  }
}
