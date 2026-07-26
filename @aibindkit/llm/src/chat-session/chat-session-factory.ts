import { randomBytes } from 'crypto';
import { LlmClient } from '../client/llm-client';
import { ChatSession } from './chat-session';
import { MessageFactory } from './messages/message-factory';
import { ToolSet } from './tools/tool-set';
import { ChatSessionStorage } from './chat-session-storage';

export class ChatSessionFactory {
  public constructor(private readonly storage: ChatSessionStorage) {}

  public create(id: string, toolsHash: string, llmClient: LlmClient, toolSet: ToolSet): ChatSession {
    const messageFactory = new MessageFactory(llmClient, toolSet);
    const token = randomBytes(24).toString('hex');
    return new ChatSession(id, token, toolsHash, this.storage, messageFactory);
  }
}
