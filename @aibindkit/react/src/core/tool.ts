import z from 'zod/v4';
import { AiBinding } from './binding';

interface AiToolBuilderState {
  description: string;
  inputZod?: z.ZodObject;
}

export class AiToolBuilder<Input = any> {
  declare private readonly __input?: Input;

  public constructor(private readonly state: AiToolBuilderState) {}

  public input<S extends z.ZodObject>(zod: S): AiToolBuilder<z.infer<S>> {
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
