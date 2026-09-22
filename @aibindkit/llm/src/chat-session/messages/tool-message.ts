import { ChatMessageMetadata, ChatMessageType, type CompletedChatMessage, type ToolCall } from '@aibindkit/core';
import { ToolSet } from '../tools/tool-set';
import { Message, MessageCompletionResult } from './message';
import { ToolContext } from '../tools';

export class ToolMessage implements Message {
  public readonly type = ChatMessageType.TOOL;

  public constructor(
    public readonly id: number,
    private readonly context: ToolContext,
    private readonly calls: ToolCall[],
    private readonly toolSet: ToolSet
  ) {}

  public async complete(signal: AbortSignal): Promise<MessageCompletionResult> {
    const completedMessages = await Promise.all(
      this.calls.map<Promise<CompletedChatMessage>>(async call => {
        if (call.type !== 'function') {
          throw new Error('Invalid tool call type');
        }
        const tool = this.toolSet.tryGetTool(call.function.name);
        let content: string;
        let metadata: ChatMessageMetadata | undefined;
        if (tool) {
          try {
            const result = await tool.execute(signal, this.context, call);
            content = result.content;
            metadata = result.metadata;
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
          message: {
            role: 'tool',
            tool_call_id: call.id,
            content
          },
          metadata
        };
      })
    );
    return { completedMessages };
  }
}
