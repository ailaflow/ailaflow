import { LlmClient, LlmModelSettings } from '../client/llm-client';
import { ChatSession } from './chat-session';
import { MessageFactory } from './messages/message-factory';
import { ToolSet } from './tools/tool-set';
import { ChatSessionStorage } from './chat-session-storage';
import { randomUUID } from 'node:crypto';

export class ChatSessionFactory {
  public constructor(private readonly storage: ChatSessionStorage) {}

  public create(id: string, toolsHash: string, llmClient: LlmClient, llmModelSettings: LlmModelSettings, toolSet: ToolSet): ChatSession {
    const messageFactory = new MessageFactory(llmClient, llmModelSettings, toolSet);
    const token = randomUUID({
      disableEntropyCache: true
    });

    return new ChatSession(
      id,
      token,
      toolsHash,
      llmModelSettings.contextWindow,
      llmModelSettings.effectiveContextWindowPercent,
      this.storage,
      messageFactory
    );
  }
}
