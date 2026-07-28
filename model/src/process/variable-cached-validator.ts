import z from 'zod/v4';
import { ProcessDefinition } from './process-definition';
import { VariableDefinition } from './variable-definition';

interface CachedZod {
  hash: string;
  zod: z.ZodType;
}

export class VariableCachedValidator {
  private readonly cache = new Map<string, CachedZod>();

  public tryGet(name: string, definition: ProcessDefinition): VariableDefinition | null {
    for (const variable of definition.properties.variables) {
      if (variable.name === name) {
        return variable;
      }
    }
    return null;
  }

  private tryGetZod(name: string, definition: ProcessDefinition): z.ZodType | null {
    const variable = this.tryGet(name, definition);
    if (!variable) {
      return null;
    }
    const cache = this.cache.get(name);
    if (cache && cache.hash === variable.schema.hash) {
      return cache.zod;
    }
    const zod = { hash: variable.schema.hash, zod: z.fromJSONSchema(variable.schema.schema) };
    this.cache.set(name, zod);
    return zod.zod;
  }

  public validateVariableExists(name: string, definition: ProcessDefinition): string | null {
    const zod = this.tryGetZod(name, definition);
    if (!zod) {
      return `Variable \$${name} does not exist.`;
    }
    return null;
  }

  public setErrorIfAnyVariableIsMissing(
    names: string[],
    definition: ProcessDefinition,
    errors: Record<string, string>,
    key: string
  ): boolean {
    for (const name of names) {
      const error = this.validateVariableExists(name, definition);
      if (error) {
        errors[key] = error;
        return true;
      }
    }
    return false;
  }

  public validateVariableValue(name: string, value: unknown, definition: ProcessDefinition): string | null {
    const zod = this.tryGetZod(name, definition);
    if (!zod) {
      return `Variable \$${name} does not exist.`;
    }
    try {
      zod.parse(value);
    } catch (e) {
      return `Value for variable \$${name} does not match the schema: ${e instanceof Error ? e.message : String(e)}`;
    }
    return null;
  }

  public assertValidVariableValue(name: string, value: unknown, definition: ProcessDefinition) {
    const error = this.validateVariableValue(name, value, definition);
    if (error) {
      throw new Error(error);
    }
  }
}
