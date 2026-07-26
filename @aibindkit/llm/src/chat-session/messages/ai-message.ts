import { Message, MessageCompletionResult } from './message';
import { ToolSet } from '../tools/tool-set';
import { ChatSessionStack } from '../chat-session-stack';
import { LlmClient } from '../../client/llm-client';
import type { CompletedMessage, ToolCall } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';

export class AiMessage implements Message {
  public readonly type = MessageType.AI;

  public constructor(
    public readonly id: number,
    private readonly llmClient: LlmClient,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal, stack: ChatSessionStack): Promise<MessageCompletionResult> {
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
      completedMessages: [completedMessage],
      toolCalls,
      totalTokens
    };
  }

  public fail(reason: string): CompletedMessage {
    return {
      role: 'user',
      content: `The request to AI server failed with reason: ${reason}`
    };
  }

  public interrupt(): CompletedMessage {
    return {
      role: 'user',
      content: 'The request to AI server was interrupted by the user.'
    };
  }
}
