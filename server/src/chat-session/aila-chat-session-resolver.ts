import { ChatSessionInitializerError, ChatSessionResolver, ResolvedChatSession } from '@aibindkit/express';
import { ChatSession, LlmClient } from '@aibindkit/llm';
import { readFileSync } from 'fs';
import { getAuthToken } from '../api/auth/auth-middleware';
import { ServerPaths } from '../core/server-paths';
import { UserToolSetProvider } from './user-tools/user-tool-set-provider';
import { Request } from 'express';

export class AilaChatSessionResolver implements ChatSessionResolver {
  private readonly userSystemPrompt: string;
  private readonly adminSystemPrompt: string;

  public constructor(
    private readonly llmClient: LlmClient,
    private readonly userToolSetProvider: UserToolSetProvider,
    serverPaths: ServerPaths
  ) {
    const path = `${serverPaths.getAilaFolderPath()}/server/assets`;
    this.userSystemPrompt = readFileSync(`${path}/user-prompt.md`, 'utf-8');
    this.adminSystemPrompt = readFileSync(`${path}/admin-prompt.md`, 'utf-8');
  }

  public resolve(httpRequest: Request, channel: Record<string, unknown>): ResolvedChatSession {
    const authToken = getAuthToken(httpRequest);

    if (channel.admin === true) {
      return {
        sessionId: this.createSessionId(authToken.userName, 'admin'),
        backendTools: [],
        backendToolsHash: '',
        llmClient: this.llmClient,
        initialize: (session: ChatSession) => {
          session.setSystemMessage(this.adminSystemPrompt);
        }
      };
    }

    if (typeof channel.name === 'string') {
      return {
        sessionId: this.createSessionId(authToken.userName, `channel:${channel.name}`),
        backendTools: this.userToolSetProvider.tools,
        backendToolsHash: this.userToolSetProvider.hash,
        llmClient: this.llmClient,
        initialize: (session: ChatSession) => {
          session.setSystemMessage(this.userSystemPrompt);
        }
      };
    }

    throw new ChatSessionInitializerError('Unsupported chat session channel');
  }

  private createSessionId(userName: string, channelId: string): string {
    return `${userName}:${channelId}`;
  }
}
