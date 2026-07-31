import { JsonSchema, ProcessExecutionVariableValues } from '@aila/model';
import { ProcessVariables } from '../../repositories/process/process-variables';

export class ProcessVariableManager {
  private readonly values = new Map<string, unknown | null>();

  public constructor(
    input: ProcessExecutionVariableValues,
    private readonly variables: ProcessVariables
  ) {
    for (const name of variables.names) {
      this.values.set(name, input[name] ?? null);
    }
  }

  public get(name: string): unknown | null {
    if (!this.values.has(name)) {
      throw new Error(`Variable \$${name} does not exist`);
    }
    return this.values.get(name) ?? null;
  }

  public getSchema(name: string): JsonSchema {
    return this.variables.getSchema(name);
  }

  public getMultiple(names: string[]): ProcessExecutionVariableValues {
    const result: ProcessExecutionVariableValues = {};
    for (const name of names) {
      result[name] = this.get(name);
    }
    return result;
  }

  public set(name: string, value: unknown): void {
    if (value === undefined) {
      throw new Error('Invalid variable value');
    }
    if (!this.values.has(name)) {
      throw new Error(`Variable \$${name} does not exist`);
    }
    const error = this.variables.validateValue(name, value);
    if (error) {
      throw new Error(error);
    }
    this.values.set(name, value);
  }

  public dump(): ProcessExecutionVariableValues {
    const output: ProcessExecutionVariableValues = {};
    for (const name of this.values.keys()) {
      output[name] = this.get(name);
    }
    return output;
  }
}
