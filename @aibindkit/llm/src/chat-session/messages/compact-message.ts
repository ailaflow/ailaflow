import { Message, MessageCompletionResult } from './message';
import { ToolSet } from '../tools/tool-set';
import { ChatSessionStack } from '../chat-session-stack';
import { LlmClient, LlmModelSettings } from '../../client/llm-client';
import { ChatMessageType, CompletedChatMessage, LlmMessageContentExtractor } from '@aibindkit/core';

const COMPACT_PROMPT = `Please stop all current actions.

Compact this session into a concise handoff for a new session.

Keep:

* Main goal and current state
* Key context, constraints, and decisions
* Work completed
* Critical technical details
* Failed approaches worth remembering
* Open issues and next steps

Remove repetition, filler, and obsolete exploration. Do not invent missing details.

End with: **Continue from this state without redoing completed work.**`;

const CONTINUE_PROMPT = `This session is being continued from a previous session. Please continue from the previous state without redoing completed work.

This is the previous session's compacted state:

`;

export class CompactMessage implements Message {
  public readonly type = ChatMessageType.COMPACT;

  public constructor(
    public readonly id: number,
    private readonly llmClient: LlmClient,
    private readonly llmModelSettings: LlmModelSettings,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(abortSignal: AbortSignal, stack: ChatSessionStack): Promise<MessageCompletionResult> {
    const llmMessages = stack.getCompletedLlmMessagesBeforeLast();
    const toolDescriptors = this.toolSet.getDescriptorsOrUndefined();

    llmMessages.push({
      role: 'user',
      content: COMPACT_PROMPT
    });

    const { message, usage } = await this.llmClient.complete(abortSignal, this.llmModelSettings, llmMessages, toolDescriptors);

    const content = LlmMessageContentExtractor.tryExtract(message);
    if (!content) {
      throw new Error('Cannot extract the compact result from the message');
    }
    if (!content.content) {
      throw new Error('The compact result content is empty');
    }

    return {
      completedMessages: [
        {
          message: {
            role: 'user',
            content: CONTINUE_PROMPT + content.content
          }
        }
      ],
      usage
    };
  }

  public fail(reason: string): CompletedChatMessage {
    return {
      message: {
        role: 'user',
        content: `The request to LLM provider failed with reason: ${reason}`
      }
    };
  }

  public interrupt(): CompletedChatMessage {
    return {
      message: {
        role: 'user',
        content: 'The request to LLM provider was interrupted by the user.'
      }
    };
  }
}
