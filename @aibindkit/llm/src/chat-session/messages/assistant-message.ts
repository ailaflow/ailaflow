import { Message, MessageCompletionResult } from './message';
import { ToolSet } from '../tools/tool-set';
import { ChatSessionStack } from '../chat-session-stack';
import { LlmClient, LlmModelSettings } from '../../client/llm-client';
import { ChatMessageType, CompletedChatMessage, type ToolCall } from '@aibindkit/core';

export class AssistantMessage implements Message {
  public readonly type = ChatMessageType.ASSISTANT;

  public constructor(
    public readonly id: number,
    private readonly llmClient: LlmClient,
    private readonly llmModelSettings: LlmModelSettings,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(signal: AbortSignal, stack: ChatSessionStack): Promise<MessageCompletionResult> {
    const llmMessages = stack.getRecentCompletedLlmMessagesBeforeLast();
    const toolDescriptors = this.toolSet.getDescriptorsOrUndefined();

    const { message, usage } = await this.llmClient.complete(signal, this.llmModelSettings, llmMessages, toolDescriptors);

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
      usage
    };
  }

  public fail(reason: string): CompletedChatMessage {
    return {
      message: {
        role: 'user',
        content: `The request to LLM server failed with reason: ${reason}`
      }
    };
  }

  public interrupt(): CompletedChatMessage {
    return {
      message: {
        role: 'user',
        content: 'The request to LLM server was interrupted by the user.'
      }
    };
  }
}
