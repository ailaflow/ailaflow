import { VariableDefinition } from '@aila/model';
import { ProcessExecutionVariableValues } from '../process-execution';

export class WorkflowVariableManager {
  private readonly values = new Map<string, unknown | null>();

  public constructor(
    input: ProcessExecutionVariableValues,
    private readonly variableDefinitions: VariableDefinition[]
  ) {
    for (const d of variableDefinitions) {
      this.values.set(d.name, input[d.name] ?? null);
    }
  }

  public get(name: string): unknown | null {
    const value = this.values.get(name);
    if (value === undefined) {
      throw new Error(`Variable "${name}" does not exist`);
    }
    return value;
  }

  public set(name: string, value: unknown): void {
    if (value === undefined) {
      throw new Error('Invalid variable value');
    }
    if (!this.values.has(name)) {
      throw new Error(`Variable "${name}" does not exist`);
    }
    this.values.set(name, value);
  }

  public dump(): ProcessExecutionVariableValues {
    const output: ProcessExecutionVariableValues = {};
    for (const d of this.variableDefinitions) {
      output[d.name] = this.get(d.name);
    }
    return output;
  }
}
