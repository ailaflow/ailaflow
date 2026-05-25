import { ToolDescriptor } from '../../llm-client/types/tool-descriptor';
import { ToolCall } from '../../llm-client/types/tool-call';

export interface Tool {
  descriptor: ToolDescriptor;

  execute(abortSignal: AbortSignal, call: ToolCall): Promise<string>;
}
