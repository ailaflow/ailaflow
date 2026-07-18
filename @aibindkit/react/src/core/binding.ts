import type { ToolDescriptor } from '@aibindkit/core';
import z from 'zod/v4';
import { AiBindingsFromTools, AiToolRecords } from './tool';

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

export class AiGlobalBuilder<Bindings extends readonly AiBinding[] = []> {
  public constructor(private readonly bindings: Bindings) {}

  public tools<T extends AiToolRecords>(tools: T): AiGlobalBuilder<AiBindingsFromTools<T>> {
    const bindings = Object.entries(tools).map(([name, builder]) => builder.build(name)) as unknown as AiBindingsFromTools<T>;
    return new AiGlobalBuilder<AiBindingsFromTools<T>>(bindings);
  }

  public build(): Bindings {
    return this.bindings;
  }
}

export function global(): AiGlobalBuilder {
  return new AiGlobalBuilder([]);
}
