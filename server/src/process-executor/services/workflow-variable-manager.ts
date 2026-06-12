import { VariableDefinition } from '@aila/model';
import { ProcessExecutionVariableValues } from '../process-execution';
import z from 'zod/v4';
import { VariableValidatorMap } from '../../repositories/process-repository/process-repository';

interface Variable {
  zod: z.ZodType;
  value: unknown | null;
}

export class WorkflowVariableManager {
  private readonly variables = new Map<string, Variable>();

  public constructor(input: ProcessExecutionVariableValues, variableValidatorMap: VariableValidatorMap) {
    for (const [name, zod] of variableValidatorMap.entries()) {
      this.variables.set(name, {
        zod,
        value: input[name] ?? null
      });
    }
  }

  public get(name: string): unknown | null {
    const variable = this.variables.get(name);
    if (!variable) {
      throw new Error(`Variable \$${name} does not exist`);
    }
    return variable.value;
  }

  public set(name: string, value: unknown): void {
    if (value === undefined) {
      throw new Error('Invalid variable value');
    }
    const variable = this.variables.get(name);
    if (!variable) {
      throw new Error(`Variable \$${name} does not exist`);
    }
    try {
      variable.zod.parse(value);
    } catch (e) {
      throw new Error(`Value for variable \$${name} does not meet the variable schema: ${(e as Error).message}`);
    }
    variable.value = value;
  }

  public dump(): ProcessExecutionVariableValues {
    const output: ProcessExecutionVariableValues = {};
    for (const name of this.variables.keys()) {
      output[name] = this.get(name);
    }
    return output;
  }
}
