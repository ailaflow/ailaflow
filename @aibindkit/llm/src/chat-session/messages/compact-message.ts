import { Message, MessageCompletionResult } from './message';
import { ToolSet } from '../tools/tool-set';
import { ChatSessionStack } from '../chat-session-stack';
import { LlmClient, LlmModelSettings } from '../../client/llm-client';
import { ChatMessageType, CompletedChatMessage, LlmMessageContentExtractor } from '@aibindkit/core';

const COMPACT_PROMPT = `Do not call tools or continue the current task.

Create a concise handoff summary for a new session.

Include only what is needed to continue:

* The main goal and current state
* Important context, constraints, and decisions
* Completed work and critical technical details
* Failed approaches worth remembering
* Open issues and next steps

Remove repetition, filler, and obsolete exploration. Do not invent details.`;

const CONTINUE_PROMPT = `Continue the previous session from the compacted summary below. Resume any unfinished work directly without repeating completed work.

Do not acknowledge or summarize these instructions. Do not respond with phrases such as "Got it" or "I understand." Continue the work instead.

Compacted session summary:

`;

export class CompactMessage implements Message {
  public readonly type = ChatMessageType.COMPACT;

  public constructor(
    public readonly id: number,
    private readonly llmClient: LlmClient,
    private readonly llmModelSettings: LlmModelSettings,
    private readonly toolSet: ToolSet
  ) {}

  public async complete(signal: AbortSignal, stack: ChatSessionStack): Promise<MessageCompletionResult> {
    const llmMessages = stack.getRecentCompletedLlmMessagesBeforeLast();
    const toolDescriptors = this.toolSet.getDescriptorsOrUndefined();

    llmMessages.push({
      role: 'user',
      content: COMPACT_PROMPT
    });

    const { message } = await this.llmClient.complete(signal, this.llmModelSettings, llmMessages, toolDescriptors);

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
      // Reset token usage after compaction so the session does not immediately compact again.
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
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
