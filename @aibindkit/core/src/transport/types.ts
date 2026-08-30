import z from 'zod/v4';
import type { ToolDescriptor } from '../tools';
import { ChatMessage } from '../chat-session/chat-message';
import { ChatMessageType } from '../chat-session';

// restoreChat

export const restoreChatRequestSchema = z.object({
  frontendTools: z.array(z.custom<ToolDescriptor>()),
  frontendToolsHash: z.string(),
  sessionKey: z.string()
});
export type RestoreChatRequest = z.infer<typeof restoreChatRequestSchema>;

export type ChatMessageUpdate = Omit<ChatMessage, 'type'> & {
  readonly type?: ChatMessageType;
};

export interface ChatContextUsageUpdate {
  readonly percent: number;
  readonly totalTokens?: number;
  readonly contextWindow?: number;
}

export interface ChatUpdate {
  readonly sessionToken?: string;
  readonly restoredMessages?: ChatMessageUpdate[];
  readonly currentMessage?: ChatMessageUpdate;
  readonly isWorking?: boolean;
  readonly contextUsage?: ChatContextUsageUpdate;
  readonly isReset?: true;
}

// sendChatMessage

export const sendChatMessageRequestSchema = z.object({
  sessionToken: z.string().min(1),
  message: z.string().min(1)
});
export const sendChatMessageResponseSchema = z.object({
  id: z.number()
});

export type SendChatMessageRequest = z.infer<typeof sendChatMessageRequestSchema>;
export type SendChatMessageResponse = z.infer<typeof sendChatMessageResponseSchema>;

// sendFrontendToolResult

export const sendFrontendToolResultRequestSchema = z.object({
  sessionToken: z.string().min(1),
  callId: z.string().min(1),
  result: z.string()
});

export type SendFrontendToolResultRequest = z.infer<typeof sendFrontendToolResultRequestSchema>;

// interruptChat

export const interruptChatRequestSchema = z.object({
  sessionToken: z.string().min(1)
});
export type InterruptChatRequest = z.infer<typeof interruptChatRequestSchema>;

// restartChat

export const restartChatRequestSchema = z.object({
  sessionToken: z.string().min(1)
});
export type RestartChatRequest = z.infer<typeof restartChatRequestSchema>;

// transport

export interface ChatTransportListener {
  onMessage(data: ChatUpdate): void;
  onClose(error?: Error): void;
}

export interface ChatTransport {
  restoreChat(abortSignal: AbortSignal, listener: ChatTransportListener, request: RestoreChatRequest): Promise<void>;
  sendChatMessage(abortSignal: AbortSignal, request: SendChatMessageRequest): Promise<SendChatMessageResponse>;
  sendFrontendToolResult(abortSignal: AbortSignal, request: SendFrontendToolResultRequest): Promise<void>;
  interruptChat(abortSignal: AbortSignal, request: InterruptChatRequest): Promise<void>;
  restartChat(abortSignal: AbortSignal, request: RestartChatRequest): Promise<void>;
}
