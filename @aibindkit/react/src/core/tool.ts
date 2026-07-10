import z from 'zod/v4';
import { AiBinding } from './binding';

interface AiToolBuilderState {
  description: string;
  zod?: z.ZodObject;
}

export class AiToolBuilder<Input = any> {
  declare private readonly __input?: Input;

  public constructor(private readonly state: AiToolBuilderState) {}

  public input<S extends z.ZodObject>(zod: S): AiToolBuilder<z.infer<S>> {
    this.state.zod = zod;
    return new AiToolBuilder<z.infer<S>>(this.state);
  }

  public build<Name extends string>(name: Name): AiBinding<Input, Name> {
    return {
      zod: this.state.zod,
      name,
      description: this.state.description,
      parameters: this.state.zod?.toJSONSchema()
    };
  }
}

export function tool(description: string): AiToolBuilder {
  return new AiToolBuilder({ description });
}
