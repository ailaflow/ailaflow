import type { ToolCall, ToolDescriptor } from '@aibindkit/model';

export interface Tool {
  descriptor: ToolDescriptor;

  execute(abortSignal: AbortSignal, call: ToolCall): Promise<string>;
}
