import { ToolCall, ToolDescriptor } from '@aila/model';

export interface Tool {
  descriptor: ToolDescriptor;

  execute(abortSignal: AbortSignal, call: ToolCall): Promise<string>;
}
