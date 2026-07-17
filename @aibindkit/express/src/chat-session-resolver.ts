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

export interface ChatSessionInitializer {
  llmClient: LlmClient;
  backendTools: Tool[];
  onSessionCreated?: (session: ChatSession) => void;
}

export interface ResolvedChatSession {
  sessionId: string;
  backendToolsHash: string;
  createInitializer(): ChatSessionInitializer;
}

export interface ChatSessionResolver {
  resolve(httpRequest: Request, channel: Record<string, unknown>): ResolvedChatSession;
}
