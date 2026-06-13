import z from 'zod/v4';
import { ProcessDefinition } from './process-definition';

interface CachedZod {
  hash: string;
  zod: z.ZodType;
}

export class VariableCachedValidator {
  private readonly cache = new Map<string, CachedZod>();

  private resolve(name: string, definition: ProcessDefinition): z.ZodType | null {
    for (const variable of definition.properties.variables) {
      if (variable.name === name) {
        let zod = this.cache.get(name);
        if (!zod || zod.hash !== variable.schema.hash) {
          zod = { hash: variable.schema.hash, zod: z.fromJSONSchema(variable.schema) };
          this.cache.set(name, zod);
        }
        return zod.zod;
      }
    }
    return null;
  }

  public validateVariableExists(name: string, definition: ProcessDefinition): string | null {
    const zod = this.resolve(name, definition);
    if (!zod) {
      return `Variable ${name} is not defined in the process definition`;
    }
    return null;
  }

  public validateVariableValue(name: string, value: unknown, definition: ProcessDefinition): string | null {
    const zod = this.resolve(name, definition);
    if (!zod) {
      return `Variable ${name} is not defined in the process definition`;
    }
    try {
      zod.parse(value);
    } catch (e) {
      return `Value for variable \${name} does not match the schema: ${e instanceof Error ? e.message : String(e)}`;
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
