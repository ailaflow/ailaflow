import type { ToolDescriptor } from '@aibindkit/core';
import z from 'zod/v4';

export interface AiBinding<Input = any, Name extends string = string> {
  readonly __input?: Input;
  name: Name;
  description: string;
  inputZod?: z.ZodObject;
  inputSchema?: ToolDescriptor['function']['parameters'];
}

export type AiBindingHandlers<Bindings extends readonly AiBinding[]> = {
  [Binding in Bindings[number] as Binding['name']]: (arg: Binding extends AiBinding<infer Arg, string> ? Arg : never) => Promise<object>;
};
