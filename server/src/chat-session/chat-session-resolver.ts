import {
  ChatSessionInitializerError,
  ChatSessionResolver as BaseChatSessionResolver,
  LlmClientWithSettings,
  ResolvedChatSession
} from '@aibindkit/express';
import { readFileSync } from 'fs';
import { getAuthToken } from '../api/auth/auth-middleware';
import { ServerPaths } from '../core/server-paths';
import { UserToolSetProvider } from './user-tools/user-tool-set-provider';
import { Request } from 'express';
import { ChatSessionId } from './chat-session-id';
import { LlmClientProvider } from '../llm/llm-client-provider';
import { LlmProviderConfigurationError } from '../repositories/llm-configuration/llm-provider-configuration';
import { LlmUseCase } from '@aila/model';

export class ChatSessionResolver implements BaseChatSessionResolver {
  private readonly userSystemPrompt: string;
  private readonly adminSystemPrompt: string;

  public constructor(
    private readonly llmClientProvider: LlmClientProvider,
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
        systemPrompt: this.adminSystemPrompt,
        getLlmClientWithSettings: abortSignal => this.getLlmClientWithSettings(abortSignal, LlmUseCase.ADMIN_CHAT)
      };
    }
    if (typeof params.name === 'string') {
      // TODO: support user-defined channels
      return {
        sessionId: ChatSessionId.createUserMainChannel(authToken.userName).encode(),
        backendTools: this.userToolSetProvider.tools,
        backendToolsHash: this.userToolSetProvider.hash,
        systemPrompt: this.userSystemPrompt,
        getLlmClientWithSettings: abortSignal => this.getLlmClientWithSettings(abortSignal, LlmUseCase.USER_CHAT)
      };
    }
    throw new ChatSessionInitializerError('Unsupported chat session channel');
  }

  private async getLlmClientWithSettings(abortSignal: AbortSignal, useCase: LlmUseCase): Promise<LlmClientWithSettings> {
    try {
      return await this.llmClientProvider.get(abortSignal, useCase);
    } catch (error) {
      if (error instanceof LlmProviderConfigurationError) {
        throw new ChatSessionInitializerError(error.message);
      }
      throw error;
    }
  }
}
