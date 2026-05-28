import { MessageType, ToolCall, ToolResponse } from '@aila/model';
import { ToolSet } from '../tools/tool-set';
import { CompleteResult, Message } from './message';

export class ToolMessage implements Message {
  public readonly type = MessageType.TOOL;

  public constructor(
    public readonly id: number,
    private readonly calls: ToolCall[],
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal): Promise<CompleteResult> {
    const completedMessage = await Promise.all(
      this.calls.map<Promise<ToolResponse>>(async call => {
        if (call.type !== 'function') {
          throw new Error('Invalid tool call type');
        }
        const tool = this.toolSet.tryGetTool(call.function.name);
        let content: string;
        if (tool) {
          try {
            content = await tool.execute(abortSignal, call);
          } catch (e) {
            content = `ERROR: tool execution failed: ${(e as Error).message ?? e}`;
          }
        } else {
          content = `ERROR: tool "${call.function.name}" not found`;
        }
        return {
          role: 'tool',
          tool_call_id: call.id,
          content
        };
      })
    );
    return {
      completedMessage
    };
  }
}
