import { randomUUID } from 'crypto';
import { LlmClient } from '../client/llm-client';
import { ChatSession } from './chat-session';
import { MessageFactory } from './messages/message-factory';
import { ToolSet } from './tools/tool-set';

export class ChatSessionFactory {
  public create(id: string, hash: string, llmClient: LlmClient, toolSet: ToolSet): ChatSession {
    const messageFactory = new MessageFactory(llmClient, toolSet);
    const token = randomUUID();
    return new ChatSession(id, token, hash, messageFactory);
  }
}
