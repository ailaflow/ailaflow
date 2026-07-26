import { Message, MessageCompletionResult } from './message';
import { ToolSet } from '../tools/tool-set';
import { ChatSessionStack } from '../chat-session-stack';
import { LlmClient } from '../../client/llm-client';
import { ChatMessageType, CompletedChatMessage, type ToolCall } from '@aibindkit/core';

export class AiMessage implements Message {
  public readonly type = ChatMessageType.AI;

  public constructor(
    public readonly id: number,
    private readonly llmClient: LlmClient,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal, stack: ChatSessionStack): Promise<MessageCompletionResult> {
    const llmMessages = stack.getCompletedLlmMessagesBeforeLast();
    const toolDescriptors = this.toolSet.getDescriptorsOrUndefined();

    const { message, totalTokens } = await this.llmClient.complete(abortSignal, llmMessages, toolDescriptors);

    let toolCalls: ToolCall[] | undefined;
    if (message.role === 'assistant') {
      toolCalls = message.tool_calls?.filter(c => c.type === 'function');
      if (!toolCalls?.length) {
        toolCalls = undefined;
      }
    }

    return {
      completedMessages: [
        {
          message
        }
      ],
      toolCalls,
      totalTokens
    };
  }

  public fail(reason: string): CompletedChatMessage {
    return {
      message: {
        role: 'user',
        content: `The request to AI server failed with reason: ${reason}`
      }
    };
  }

  public interrupt(): CompletedChatMessage {
    return {
      message: {
        role: 'user',
        content: 'The request to AI server was interrupted by the user.'
      }
    };
  }
}
