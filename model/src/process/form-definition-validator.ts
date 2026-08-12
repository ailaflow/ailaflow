import { FormDefinition } from './form-definition';
import { ProcessDefinition } from './process-definition';
import { VariableCachedValidator } from './variable-cached-validator';

export class FormDefinitionValidator {
  public static validate(
    form: FormDefinition,
    inputVariableNames: string[],
    definition: ProcessDefinition,
    variableValidator: VariableCachedValidator
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    for (let i = 0; i < form.inputExamples.length; i++) {
      const v = form.inputExamples[i];
      let error: string | null = null;
      if (!inputVariableNames.includes(v.variableName)) {
        error = `Variable "${v.variableName}" is not defined as an input variable.`;
      } else if (v.exampleValue) {
        try {
          const json = JSON.parse(v.exampleValue);
          error = variableValidator.validateVariableValue(v.variableName, json, definition);
        } catch {
          error = `Test value is not valid JSON`;
        }
      } else {
        error = variableValidator.validateVariableReference(v.variableName, definition);
      }
      if (error) {
        errors[`inputExamples.${i}`] = error;
      }
    }
    return errors;
  }
}
