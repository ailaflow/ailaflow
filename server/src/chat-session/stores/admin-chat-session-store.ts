import { ToolDescriptor } from '@aila/model';
import { ChatSessionFactory } from '../chat-session-factory';
import { LlmClient } from '../../llm-client/llm-client';
import { ToolSet } from '../tools/tool-set';
import { FrontendToolFactory } from '../tools/frontend-tool-factory';
import { ChatSessionStore } from './chat-session-store';
import { ChatSession } from '../chat-session';

export class AdminChatSessionStore {
  public constructor(
    private readonly store: ChatSessionStore,
    private readonly chatSessionFactory: ChatSessionFactory,
    private readonly frontendToolFactory: FrontendToolFactory,
    private readonly llmClient: LlmClient
  ) {}

  public tryGet(userName: string, hash: string): ChatSession | undefined {
    return this.store.tryGetWithHashCheck(userName, 'admin', hash);
  }

  public create(userName: string, hash: string, frontendToolDescriptors: ToolDescriptor[]): ChatSession {
    const toolSet = new ToolSet();
    for (const descriptor of frontendToolDescriptors) {
      toolSet.addTool(this.frontendToolFactory.create(descriptor));
    }

    const session = this.chatSessionFactory.create('admin', hash, this.llmClient, toolSet);
    session.pushSystemMessage('You are an assistant for admin users.');

    this.store.set(userName, session);
    return session;
  }
}
