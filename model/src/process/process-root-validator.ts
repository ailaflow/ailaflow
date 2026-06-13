import { Definition } from 'sequential-workflow-model';
import { ProcessDefinition } from './process-definition';
import z from 'zod';
import { VariableCachedValidator } from './variable-cached-validator';
import { FormDefinitionValidator } from './form-definition-validator';

export class ProcessRootValidator {
  public constructor(private readonly variableValidator: VariableCachedValidator) {}

  public validate(definition: ProcessDefinition): Record<string, string> {
    const errors: Record<string, string> = {};
    const usedVariableNames: string[] = [];

    for (let i = 0; i < definition.properties.variables.length; i++) {
      const variable = definition.properties.variables[i];
      if (variable.name.length < 3 || variable.name.length > 20) {
        errors[`variables.${i}.name`] = 'Variable name must be between 3 and 20 characters long.';
      } else if (!/^[a-z][a-z0-9_]*$/.test(variable.name)) {
        errors[`variables.${i}.name`] = 'Variable name contains invalid characters.';
      } else if (usedVariableNames.includes(variable.name)) {
        errors[`variables.${i}.name`] = 'Variable name must be unique.';
      } else {
        usedVariableNames.push(variable.name);
      }
      try {
        z.fromJSONSchema(variable.schema);
      } catch (e) {
        errors[`variables.${i}.schema`] = `Invalid schema: ${(e as Error)?.message ?? e}.`;
      }
    }

    if (Object.keys(errors).length === 0) {
      if (definition.properties.inputForm) {
        const error = FormDefinitionValidator.validate(definition.properties.inputForm, definition, this.variableValidator);
        if (error) {
          errors['properties.inputForm'] = error;
        }
      }

      if (definition.properties.outputForm) {
        const error = FormDefinitionValidator.validate(definition.properties.outputForm, definition, this.variableValidator);
        if (error) {
          errors['properties.outputForm'] = error;
        }
      }
    }
    return errors;
  }

  public readonly validateRoot = (definition: Definition): boolean => {
    return Object.keys(this.validate(definition as ProcessDefinition)).length === 0;
  };
}
