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

  public resolve(sessionKey: string, authContext: ChatAuthContext): ResolvedChatSession {
    const userName = authContext['userName'] as string;
    const isAdmin = authContext['isAdmin'] as boolean;
    if (typeof userName !== 'string' || typeof isAdmin !== 'boolean') {
      throw new ChatSessionInitializerError('Invalid auth context');
    }

    const [type, value] = sessionKey.split(':', 2);
    if (isAdmin) {
      if (type === 'admin') {
        return this.resolveAdminChannel(userName);
      }
      if (type === 'test') {
        const testUserName = value;
        return this.resolveUserChannel(testUserName, 'test');
      }
    }
    if (type === 'user') {
      if (value !== 'default') {
        throw new Error('Only the default user channel is supported'); // TODO: support user-defined channels
      }
      return this.resolveUserChannel(userName, value);
    }

    // TODO: support user-defined channels
    throw new ChatSessionInitializerError(`Unsupported chat session key: ${sessionKey}`);
  }

  private resolveAdminChannel(userName: string): ResolvedChatSession {
    return {
      sessionId: ChatSessionId.createAdmin(userName).encode(),
      backendTools: [],
      backendToolsHash: '',
      systemPrompt: this.adminSystemPrompt,
      getLlmClientWithSettings: abortSignal => this.getLlmClientWithSettings(abortSignal, LlmUseCase.ADMIN_CHAT)
    };
  }

  private resolveUserChannel(userName: string, channelName: string): ResolvedChatSession {
    return {
      sessionId: ChatSessionId.createUserChannel(userName, channelName).encode(),
      backendTools: this.userToolSetProvider.tools,
      backendToolsHash: this.userToolSetProvider.hash,
      systemPrompt: this.userSystemPrompt,
      getLlmClientWithSettings: abortSignal => this.getLlmClientWithSettings(abortSignal, LlmUseCase.USER_CHAT)
    };
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
