import { CompleteResult, Message, MessageType } from './message';
import { ToolSet } from '../tools/tool-set';
import { SessionStack } from '../session-stack';
import { LlmClient } from '../../llm-client/llm-client';
import { ToolCall } from '../../llm-client/types/tool-call';

export class AiMessage implements Message {
  public readonly type = MessageType.AI;

  public constructor(
    private readonly llmClient: LlmClient,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal, stack: SessionStack): Promise<CompleteResult> {
    const completedMessages = stack.getCompletedMessagesBeforeLast();
    const toolDescriptors = this.toolSet.getDescriptorsOrUndefined();

    const { completedMessage, totalTokens } = await this.llmClient.complete(abortSignal, completedMessages, toolDescriptors);

    let toolCalls: ToolCall[] | undefined;
    if (completedMessage.role === 'assistant') {
      toolCalls = completedMessage.tool_calls?.filter(c => c.type === 'function');
      if (!toolCalls?.length) {
        toolCalls = undefined;
      }
    }

    return {
      completedMessage,
      toolCalls,
      totalTokens
    };
  }
}
