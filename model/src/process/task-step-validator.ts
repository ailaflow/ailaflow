import { ProcessDefinition } from './process-definition';
import { VariableCachedValidator } from './variable-cached-validator';

export class TaskStepValidator {
  public static validateOutputVariables(
    variableValidator: VariableCachedValidator,
    definition: ProcessDefinition,
    outputVariableNames: string[]
  ): string | null {
    const referenceError = variableValidator.validateVariablesReference(outputVariableNames, definition);

    if (referenceError) {
      return referenceError;
    }

    for (const name of outputVariableNames) {
      const variable = variableValidator.tryGet(name, definition);
      if (variable && variable.schema.schema.type !== 'array') {
        return `Variable \$${name} must be of type array.`;
      }
    }

    return null;
  }
}
