import { LlmClient } from '../llm-client/llm-client';
import { ChatSession } from './chat-session';
import { MessageFactory } from './messages/message-factory';
import { ToolSet } from './tools/tool-set';

export class ChatSessionFactory {
  public create(id: string, hash: string, llmClient: LlmClient, toolSet: ToolSet): ChatSession {
    const messageFactory = new MessageFactory(llmClient, toolSet);
    return new ChatSession(id, hash, messageFactory);
  }
}
