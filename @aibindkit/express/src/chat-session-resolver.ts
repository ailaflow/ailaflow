import type { Request } from 'express';
import type { ChatSession, LlmClient, Tool } from '@aibindkit/llm';

export class ChatSessionInitializerError extends Error {
  public static is(error: unknown): error is ChatSessionInitializerError {
    return error instanceof ChatSessionInitializerError;
  }

  public constructor(message: string) {
    super(message);
    this.name = 'ChatSessionInitializerError';
  }
}

export interface ResolvedChatSession {
  sessionId: string;
  backendTools: Tool[];
  backendToolsHash: string;
  llmClient: LlmClient;
  activate(session: ChatSession): void;
}

export interface ChatSessionResolver {
  resolve(httpRequest: Request, params: Record<string, unknown>): ResolvedChatSession;
}
