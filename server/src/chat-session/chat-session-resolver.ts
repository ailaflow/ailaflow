import { ChatSessionInitializerError, ChatSessionResolver as BaseChatSessionResolver, ResolvedChatSession } from '@aibindkit/express';
import { ChatSession, LlmClient } from '@aibindkit/llm';
import { readFileSync } from 'fs';
import { getAuthToken } from '../api/auth/auth-middleware';
import { ServerPaths } from '../core/server-paths';
import { UserToolSetProvider } from './user-tools/user-tool-set-provider';
import { Request } from 'express';
import { ChatSessionIdProvider } from './chat-session-id-provider';

export class ChatSessionResolver implements BaseChatSessionResolver {
  private readonly userSystemPrompt: string;
  private readonly adminSystemPrompt: string;

  public constructor(
    private readonly llmClient: LlmClient,
    private readonly sessionIdProvider: ChatSessionIdProvider,
    private readonly userToolSetProvider: UserToolSetProvider,
    serverPaths: ServerPaths
  ) {
    const path = `${serverPaths.getAilaFolderPath()}/server/assets`;
    this.userSystemPrompt = readFileSync(`${path}/user-prompt.md`, 'utf-8');
    this.adminSystemPrompt = readFileSync(`${path}/admin-prompt.md`, 'utf-8');
  }

  public resolve(httpRequest: Request, params: Record<string, unknown>): ResolvedChatSession {
    const authToken = getAuthToken(httpRequest);
    if (params.admin === true) {
      return {
        sessionId: this.sessionIdProvider.getAdmin(authToken.userName),
        backendTools: [],
        backendToolsHash: '',
        llmClient: this.llmClient,
        activate: (session: ChatSession) => {
          session.setSystemMessage(this.adminSystemPrompt);
        }
      };
    }

    if (typeof params.name === 'string') {
      return {
        sessionId: this.sessionIdProvider.getUserDefaultChannel(authToken.userName), // TODO
        backendTools: this.userToolSetProvider.tools,
        backendToolsHash: this.userToolSetProvider.hash,
        llmClient: this.llmClient,
        activate: (session: ChatSession) => {
          session.setSystemMessage(this.userSystemPrompt);
        }
      };
    }

    throw new ChatSessionInitializerError('Unsupported chat session channel');
  }
}
