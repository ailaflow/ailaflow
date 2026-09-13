import * as z from 'zod/v4';
import { AiBinding, AiToolInputZod } from './binding';

interface AiToolBuilderState {
  description: string;
  inputZod?: AiToolInputZod;
}

export type AiToolRecords = Record<string, AiToolBuilder<any>>;
export type AiBindingFromTool<Name extends string, T> = T extends AiToolBuilder<infer Arg> ? AiBinding<Arg, Name> : never;

export type AiBindingsFromTools<T extends AiToolRecords> = readonly {
  [K in keyof T & string]: AiBindingFromTool<K, T[K]>;
}[keyof T & string][];

export class AiToolBuilder<Input = any> {
  declare private readonly __input?: Input;

  public constructor(private readonly state: AiToolBuilderState) {}

  public input<S extends AiToolInputZod>(zod: S): AiToolBuilder<z.infer<S>> {
    this.state.inputZod = zod;
    return new AiToolBuilder<z.infer<S>>(this.state);
  }

  public build<Name extends string>(name: Name): AiBinding<Input, Name> {
    return {
      name,
      description: this.state.description,
      inputZod: this.state.inputZod,
      inputSchema: this.state.inputZod?.toJSONSchema()
    };
  }
}

export function tool(description: string): AiToolBuilder {
  return new AiToolBuilder({ description });
}
