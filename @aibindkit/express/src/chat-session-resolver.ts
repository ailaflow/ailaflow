import type { LlmClient, LlmModelSettings, Tool } from '@aibindkit/llm';
import { ChatAuthContext } from './chat-auth-context-resolver';

export class ChatSessionInitializerError extends Error {
  public static is(error: unknown): error is ChatSessionInitializerError {
    return error instanceof ChatSessionInitializerError;
  }

  public constructor(message: string) {
    super(message);
    this.name = 'ChatSessionInitializerError';
  }
}

export interface LlmClientWithSettings {
  client: LlmClient;
  modelSettings: LlmModelSettings;
}

export interface ResolvedChatSession {
  sessionId: string;
  backendTools: Tool[];
  backendToolsHash: string;
  systemPrompt?: string;
  getLlmClientWithSettings(abortSignal: AbortSignal): Promise<LlmClientWithSettings>;
}

export interface ChatSessionResolver {
  resolve(sessionKey: string, authContext: ChatAuthContext): ResolvedChatSession;
}
