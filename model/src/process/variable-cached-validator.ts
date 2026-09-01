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

  public validateVariableReference(name: string, definition: ProcessDefinition): string | null {
    const variable = this.tryGet(name, definition);
    if (!variable) {
      return `Variable \$${name} does not exist`;
    }
    return null;
  }

  public validateVariablesReference(names: string[], definition: ProcessDefinition): string | null {
    for (const name of names) {
      const error = this.validateVariableReference(name, definition);
      if (error) {
        return error;
      }
    }
    return null;
  }

  public validateVariableType(name: string, type: string, definition: ProcessDefinition): string | null {
    const variable = this.tryGet(name, definition);
    if (!variable) {
      return `Variable \$${name} does not exist`;
    }
    if (variable.schema.schema.type !== type) {
      return `Variable \$${name} must be of type ${type}`;
    }
    return null;
  }

  public validateVariableValue(name: string, value: unknown, definition: ProcessDefinition): string | null {
    const zod = this.tryGetZod(name, definition);
    if (!zod) {
      return `Variable \$${name} does not exist`;
    }
    try {
      zod.parse(value);
    } catch (e) {
      return `Value for variable \$${name} does not match the schema: ${e instanceof Error ? e.message : String(e)}`;
    }
    return null;
  }

  public validateVariablesValue(names: string[], values: Record<string, unknown>, definition: ProcessDefinition): string | null {
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      return 'Input values must be a JSON object';
    }
    const keys = Object.keys(values);
    for (const name of keys) {
      if (!names.includes(name)) {
        return `Variable \$${name} value is not expected in the input values`;
      }
    }
    for (const name of names) {
      const error = this.validateVariableValue(name, values[name], definition);
      if (error) {
        return error;
      }
    }
    return null;
  }

  public assertVariableValueIsValid(name: string, value: unknown, definition: ProcessDefinition) {
    const error = this.validateVariableValue(name, value, definition);
    if (error) {
      throw new Error(error);
    }
  }
}
