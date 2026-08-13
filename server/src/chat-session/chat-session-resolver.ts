import {
  ChatSessionInitializerError,
  ChatSessionResolver as BaseChatSessionResolver,
  LlmClientWithSettings,
  ResolvedChatSession,
  ChatAuthContext
} from '@aibindkit/express';
import { readFileSync } from 'fs';
import { ServerPaths } from '../core/server-paths';
import { UserToolSetProvider } from './user-tools/user-tool-set-provider';
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

  public resolve(channelName: string, authContext: ChatAuthContext): ResolvedChatSession {
    const userName = authContext['userName'] as string;

    if (channelName === 'admin') {
      return {
        sessionId: ChatSessionId.createAdmin(userName).encode(),
        backendTools: [],
        backendToolsHash: '',
        systemPrompt: this.adminSystemPrompt,
        getLlmClientWithSettings: abortSignal => this.getLlmClientWithSettings(abortSignal, LlmUseCase.ADMIN_CHAT)
      };
    }

    if (channelName === 'default') {
      return {
        sessionId: ChatSessionId.createUserMainChannel(userName).encode(),
        backendTools: this.userToolSetProvider.tools,
        backendToolsHash: this.userToolSetProvider.hash,
        systemPrompt: this.userSystemPrompt,
        getLlmClientWithSettings: abortSignal => this.getLlmClientWithSettings(abortSignal, LlmUseCase.USER_CHAT)
      };
    }

    // TODO: support user-defined channels
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
