import type { ToolDescriptor } from '@aibindkit/core';
import z from 'zod/v4';

export interface AiBinding<Input = any, Name extends string = string> {
  readonly __input?: Input;
  zod?: z.ZodObject;
  name: Name;
  description: string;
  parameters?: ToolDescriptor['function']['parameters'];
}

export type AiSetter<Bindings extends readonly AiBinding[]> = {
  [Binding in Bindings[number] as Binding['name']]: (arg: Binding extends AiBinding<infer Arg, string> ? Arg : never) => Promise<object>;
};
