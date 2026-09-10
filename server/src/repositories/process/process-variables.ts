import { JsonSchema, ProcessExecutionVariableValues, VariableDefinition } from '@ailaflow/shared';
import z from 'zod/v4';

export class ProcessVariables {
  private readonly variables: Record<string, VariableDefinition> = {};
  private readonly zod: Record<string, z.ZodType> = {};

  public readonly names: string[] = [];

  public constructor(
    private readonly startVariableNames: string[],
    variables: VariableDefinition[]
  ) {
    for (const v of variables) {
      this.variables[v.name] = v;
      this.names.push(v.name);
    }
  }

  public getSchema(name: string): JsonSchema {
    const v = this.variables[name];
    if (!v) {
      throw new Error(`Cannot find variable: ${name}`);
    }
    return v.schema;
  }

  public getZodSchema(name: string): z.ZodType {
    let zod = this.zod[name];
    if (!zod) {
      zod = z.fromJSONSchema(this.getSchema(name));
      this.zod[name] = zod;
    }
    return zod;
  }

  public validateValue(name: string, value: unknown): string | null {
    const zod = this.getZodSchema(name);
    const { error } = zod.safeParse(value);
    if (error) {
      return `Variable value \$${name} does not meet the required schema: ${error}`;
    }
    return null;
  }

  public validateStartValues(values: ProcessExecutionVariableValues): string | null {
    const passedVariableNames = Object.keys(values);
    if (this.startVariableNames.length === 0) {
      if (passedVariableNames.length > 0) {
        return 'Process does not have start variables';
      }
      return null;
    }

    const startVariableNameSet = new Set(this.startVariableNames);
    for (const name of passedVariableNames) {
      if (!startVariableNameSet.has(name)) {
        return `Variable \$${name} is not a start variable`;
      }
    }

    if (passedVariableNames.length !== this.startVariableNames.length) {
      return 'Passed incorrect number of variable values';
    }

    for (const name of this.startVariableNames) {
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
