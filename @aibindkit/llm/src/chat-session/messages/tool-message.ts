import type { ToolCall, ToolResponse } from '@aibindkit/model';
import { MessageType } from '@aibindkit/model';
import { ToolSet } from '../tools/tool-set';
import { Message, MessageCompleteResult } from './message';

export class ToolMessage implements Message {
  public readonly type = MessageType.TOOL;

  public constructor(
    public readonly id: number,
    private readonly calls: ToolCall[],
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal): Promise<MessageCompleteResult> {
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
            content = JSON.stringify({
              error: `Tool execution failed: ${(e as Error).message ?? e}`
            });
          }
        } else {
          content = JSON.stringify({
            error: `Tool not found: ${call.function.name}`
          });
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
