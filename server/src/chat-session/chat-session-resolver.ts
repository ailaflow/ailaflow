import { ChatSessionInitializerError, ChatSessionResolver as BaseChatSessionResolver, ResolvedChatSession } from '@aibindkit/express';
import { LlmClient } from '@aibindkit/llm';
import { readFileSync } from 'fs';
import { getAuthToken } from '../api/auth/auth-middleware';
import { ServerPaths } from '../core/server-paths';
import { UserToolSetProvider } from './user-tools/user-tool-set-provider';
import { Request } from 'express';
import { ChatSessionId } from './chat-session-id';

export class ChatSessionResolver implements BaseChatSessionResolver {
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

  public resolve(httpRequest: Request, params: Record<string, unknown>): ResolvedChatSession {
    const authToken = getAuthToken(httpRequest);
    if (params.admin === true) {
      return {
        sessionId: ChatSessionId.createAdmin(authToken.userName).encode(),
        backendTools: [],
        backendToolsHash: '',
        llmClient: this.llmClient,
        systemPrompt: this.adminSystemPrompt
      };
    }
    if (typeof params.name === 'string') {
      // TODO: support user-defined channels
      return {
        sessionId: ChatSessionId.createUserMainChannel(authToken.userName).encode(),
        backendTools: this.userToolSetProvider.tools,
        backendToolsHash: this.userToolSetProvider.hash,
        llmClient: this.llmClient,
        systemPrompt: this.userSystemPrompt
      };
    }
    throw new ChatSessionInitializerError('Unsupported chat session channel');
  }
}
