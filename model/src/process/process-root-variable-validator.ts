import * as z from 'zod/v4';
import { JsonSchema } from './variable-definition';

export class ProcessRootVariableValidator {
  public static validateName(name: string): string | null {
    if (name.length < 3 || name.length > 20) {
      return 'Variable name must be 3 to 20 characters long';
    } else if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return 'Variable name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores';
    }
    return null;
  }

  public static validateSchema(schema: JsonSchema): string | null {
    try {
      z.fromJSONSchema(schema);
    } catch (e) {
      return (e as Error)?.message ?? String(e);
    }
    return null;
  }
}
