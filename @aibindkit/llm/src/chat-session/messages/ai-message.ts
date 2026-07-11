import { Message, MessageCompleteResult } from './message';
import { ToolSet } from '../tools/tool-set';
import { SessionStack } from '../session-stack';
import { LlmClient } from '../../client/llm-client';
import type { ToolCall } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';

export class AiMessage implements Message {
  public readonly type = MessageType.AI;

  public constructor(
    public readonly id: number,
    private readonly llmClient: LlmClient,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal, stack: SessionStack): Promise<MessageCompleteResult> {
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
