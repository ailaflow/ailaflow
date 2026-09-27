import { JsonSchema, ProcessExecutionVariableValues } from '@ailaflow/shared';
import * as z from 'zod/v4';

export class TaskVariables {
  private readonly outputVariableNames: string[];
  private readonly zod = new Map<string, z.ZodType>();

  public constructor(private readonly outputVariableSchemas: Record<string, JsonSchema> | null) {
    this.outputVariableNames = outputVariableSchemas ? Object.keys(outputVariableSchemas) : [];
  }

  private validateValue(name: string, value: unknown): string | null {
    if (!this.outputVariableSchemas) {
      return `Task does not have output variables`;
    }
    let zod = this.zod.get(name);
    if (!zod) {
      const schema = this.outputVariableSchemas[name];
      if (!schema) {
        return `Cannot find output variable: ${name}`;
      }
      zod = z.fromJSONSchema(schema);
      this.zod.set(name, zod);
    }
    const { error } = zod.safeParse(value);
    if (error) {
      return `Variable value \$${name} does not meet the required schema: ${error}`;
    }
    return null;
  }

  public validateOutputValues(values: ProcessExecutionVariableValues): string | null {
    const passedVariableNames = Object.keys(values);

    if (this.outputVariableSchemas === null) {
      if (passedVariableNames.length > 0) {
        return 'Task does not have output variables';
      }
      return null;
    }

    for (const name of passedVariableNames) {
      if (!this.outputVariableNames.includes(name)) {
        return `Variable \$${name} is not an output variable`;
      }
    }

    if (passedVariableNames.length !== this.outputVariableNames.length) {
      return 'Passed incorrect number of output variable';
    }

    for (const name of this.outputVariableNames) {
      if (!(name in values)) {
        return `Missing start variable: \$${name}`;
      }
      const value = values[name];
      const error = this.validateValue(name, value);
      if (error) {
        return error;
      }
    }

    return null;
  }
}
