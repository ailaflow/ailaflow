import { Definition } from 'sequential-workflow-model';
import { ProcessDefinition } from './process-definition';
import { VariableCachedValidator } from './variable-cached-validator';
import { FormDefinitionValidator } from './form-definition-validator';
import { ProcessRootVariableValidator } from './process-root-variable-validator';

export class ProcessRootValidator {
  public constructor(private readonly variableValidator: VariableCachedValidator) {}

  public validate(definition: ProcessDefinition): Record<string, string> {
    const errors: Record<string, string> = {};
    const usedVariableNames: string[] = [];

    for (let i = 0; i < definition.properties.variables.length; i++) {
      const variable = definition.properties.variables[i];
      const variableError = ProcessRootVariableValidator.validateName(variable.name);
      if (variableError) {
        errors[`variables.${i}.name`] = variableError;
      } else if (usedVariableNames.includes(variable.name)) {
        errors[`variables.${i}.name`] = 'Variable names must be unique';
      } else {
        usedVariableNames.push(variable.name);
      }

      const schemaError = ProcessRootVariableValidator.validateSchema(variable.schema);
      if (schemaError) {
        errors[`variables.${i}.schema`] = `Invalid schema: ${schemaError}`;
      }
    }

    if (Object.keys(errors).length === 0) {
      if (definition.properties.startForm) {
        const e = Object.values(
          FormDefinitionValidator.validate(
            definition.properties.startForm,
            definition.properties.startVariableNames,
            definition,
            this.variableValidator
          )
        );
        if (e.length > 0) {
          errors['properties.inputForm'] = e[0];
        }
      }
    }

    this.variableValidator.setErrorIfAnyVariableIsMissing(
      definition.properties.startVariableNames,
      definition,
      errors,
      'properties.startVariableNames'
    );
    return errors;
  }

  public readonly validateRoot = (definition: Definition): boolean => {
    return Object.keys(this.validate(definition as ProcessDefinition)).length === 0;
  };
}
