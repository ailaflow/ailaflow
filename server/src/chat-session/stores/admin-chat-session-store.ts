import { ToolDescriptor } from '@aila/model';
import { ChatSessionFactory } from '../chat-session-factory';
import { LlmClient } from '../../llm-client/llm-client';
import { ToolSet } from '../tools/tool-set';
import { FrontendToolFactory } from '../tools/frontend-tool-factory';
import { ChatSessionStore } from './chat-session-store';
import { ChatSession } from '../chat-session';

const SYSTEM_PROMPT = `You are a user interface AI helper. Your role is to help users edit settings in the Aila project. A user has opened a web application where they can change the system configuration.

You have access to multiple tools that are bound to the UI. When a user requests a change, you must use these tools to deliver the expected result.

Keep in mind that tools are available only on specific pages. For example, if you are inside the container editor, you can run the \`container_get_name\` tool, but this tool will return an error if you are on the container list page.

You can navigate in the browser using the dedicated navigation tools. You can also always check which page you are on by calling the \`get_current_page\` tool.

Keep in mind that tools are grouped with prefixes that correspond to specific pages. For example, on the \`container_editor\` page, all tools that allow you to act on that page start with the \`container_editor_*\` prefix.`;

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
    session.pushSystemMessage(SYSTEM_PROMPT);

    this.store.set(userName, session);
    return session;
  }
}
