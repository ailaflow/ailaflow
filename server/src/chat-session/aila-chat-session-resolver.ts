import { ChatSessionInitializerError, ChatSessionResolver, ResolvedChatSession } from '@aibindkit/express';
import { ChatSession, LlmClient } from '@aibindkit/llm';
import { readFileSync } from 'fs';
import { getAuthToken } from '../api/auth/auth-middleware';
import { ServerPaths } from '../core/server-paths';
import { UserToolSetProvider } from './stores/user-tool-set-provider';
import { Request } from 'express';

const USER_SYSTEM_PROMPT = 'You are Aila, an AI assistant.';

export class AilaChatSessionResolver implements ChatSessionResolver {
  private readonly adminSystemPrompt: string;

  public constructor(
    private readonly llmClient: LlmClient,
    private readonly userToolSetProvider: UserToolSetProvider,
    serverPaths: ServerPaths
  ) {
    this.adminSystemPrompt = readFileSync(`${serverPaths.getAilaFolderPath()}/server/assets/admin-prompt.md`, 'utf-8');
  }

  public resolve(httpRequest: Request, channel: Record<string, unknown>): ResolvedChatSession {
    const authToken = getAuthToken(httpRequest);

    if (channel.admin === true) {
      return {
        sessionId: this.createSessionId(authToken.userName, 'admin'),
        backendToolsHash: '',
        createInitializer: () => ({
          llmClient: this.llmClient,
          backendTools: [],
          onSessionCreated: session => session.setSystemMessage(this.adminSystemPrompt)
        })
      };
    }

    if (typeof channel.name === 'string') {
      return {
        sessionId: this.createSessionId(authToken.userName, `channel:${channel.name}`),
        backendToolsHash: this.userToolSetProvider.hash,
        createInitializer: () => ({
          llmClient: this.llmClient,
          backendTools: this.userToolSetProvider.tools,
          onSessionCreated: session => session.setSystemMessage(USER_SYSTEM_PROMPT)
        })
      };
    }

    throw new ChatSessionInitializerError('Unsupported chat session channel');
  }

  private createSessionId(userName: string, channelId: string): string {
    return `${userName}:${channelId}`;
  }
}
