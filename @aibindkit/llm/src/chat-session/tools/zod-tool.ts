import { ChatMessageMetadata, ToolCall, ToolDescriptor } from '@aibindkit/core';
import { Tool, ToolContext, ToolExecutionResult } from './tool';
import z from 'zod/v4';

export interface ZodToolExecutionResult {
  content: object;
  metadata?: ChatMessageMetadata;
}

export abstract class ZodTool<T = void> implements Tool {
  private readonly inputZod?: z.ZodObject;
  public readonly descriptor: ToolDescriptor;

  public constructor(name: string, description: string, inputZod?: z.ZodObject, inputJsonSchema?: Record<string, unknown>) {
    this.inputZod = inputZod;

    // We should pass `inputJsonSchema` to the constructor if we don't want to perform the conversion to JSON Schema using `toJSONSchema()`.
    const schema =
      inputJsonSchema ??
      inputZod?.toJSONSchema({
        target: 'json-schema'
      });
    this.descriptor = {
      type: 'function',
      function: {
        name,
        description,
        parameters: schema ?? { type: 'object', properties: {} }
      }
    };
  }

  public async execute(abortSignal: AbortSignal, context: ToolContext, call: ToolCall): Promise<ToolExecutionResult> {
    let result: ZodToolExecutionResult;
    if (this.inputZod) {
      const json = JSON.parse(call.function.arguments);
      const { data, error } = this.inputZod.safeParse(json);
      if (error) {
        return {
          content: JSON.stringify({
            error: `Invalid tool arguments: ${error.message}`
          })
        };
      }
      result = await this.handle(abortSignal, context, data as T);
    } else {
      result = await this.handle(abortSignal, context, undefined as T);
    }
    return {
      content: JSON.stringify(result.content),
      metadata: result.metadata
    };
  }

  protected abstract handle(abortSignal: AbortSignal, context: ToolContext, arg: T): Promise<ZodToolExecutionResult>;
}
