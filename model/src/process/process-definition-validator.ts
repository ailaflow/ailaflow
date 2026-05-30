import { Definition } from 'sequential-workflow-model';
import { ProcessDefinition } from './process-definition';

export class ProcessDefinitionValidator {
  public static validateRootProperties(properties: ProcessDefinition['properties']): Record<string, string> {
    const errors: Record<string, string> = {};
    const usedVariableNames: string[] = [];

    for (let i = 0; i < properties.variables.length; i++) {
      const variable = properties.variables[i];
      if (variable.name.length < 3 || variable.name.length > 20) {
        errors[`variables.${i}.name`] = 'Variable name must be between 3 and 20 characters long.';
      } else if (!/^[a-z][a-z0-9_]*$/.test(variable.name)) {
        errors[`variables.${i}.name`] = 'Variable name contains invalid characters.';
      } else if (usedVariableNames.includes(variable.name)) {
        errors[`variables.${i}.name`] = 'Variable name must be unique.';
      } else {
        usedVariableNames.push(variable.name);
      }
    }

    return errors;
  }

  public static validateRoot(definition: Definition): boolean {
    return Object.keys(ProcessDefinitionValidator.validateRootProperties((definition as ProcessDefinition).properties)).length === 0;
  }
}
