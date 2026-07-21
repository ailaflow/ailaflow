import { ToolCall } from '@aibindkit/core';
import { ChatCompletionFunctionTool } from 'openai/resources';
import { Tool, ToolContext } from './tool';
import z from 'zod/v4';

export abstract class ZodTool<T = void> implements Tool {
  private readonly inputZod?: z.ZodObject;
  public readonly descriptor: ChatCompletionFunctionTool;

  public constructor(name: string, description: string, inputZod?: z.ZodObject) {
    this.inputZod = inputZod;
    this.descriptor = {
      type: 'function',
      function: {
        name,
        description,
        parameters: inputZod?.toJSONSchema()
      }
    };
  }

  public async execute(abortSignal: AbortSignal, context: ToolContext, call: ToolCall): Promise<string> {
    let result: object;
    if (this.inputZod) {
      const json = JSON.parse(call.function.arguments);
      const { data, error } = this.inputZod.safeParse(json);
      if (error) {
        return JSON.stringify({
          error: `Invalid tool arguments: ${error.message}`
        });
      }
      result = await this.handle(abortSignal, context, data as T);
    } else {
      result = await this.handle(abortSignal, context, undefined as T);
    }
    return JSON.stringify(result);
  }

  protected abstract handle(abortSignal: AbortSignal, context: ToolContext, arg: T): Promise<object>;
}
