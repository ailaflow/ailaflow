import z from 'zod/v4';
import type { CompletedMessage, MessageType } from '../chat-session';
import type { ToolDescriptor } from '../tools';

// restoreChat

export const restoreChatRequestSchema = z.object({
  frontendTools: z.array(z.custom<ToolDescriptor>()),
  frontendToolsHash: z.string().min(1),
  channel: z.record(z.string(), z.unknown())
});
export type RestoreChatRequest = z.infer<typeof restoreChatRequestSchema>;

export interface MessageChatUpdate {
  id: number;
  type: MessageType;
  failReason?: string;
  completedMessage?: CompletedMessage | CompletedMessage[];
}

export interface HelloChatUpdate {
  chatSessionId: string;
}

export interface ChatUpdate {
  hello?: HelloChatUpdate;
  messages?: MessageChatUpdate[];
  currentMessage?: MessageChatUpdate;
}

// sendChatSessionMessage

export const sendChatMessageRequestSchema = z.object({
  chatSessionId: z.string().min(1),
  message: z.string().min(1)
});
export const sendChatMessageResponseSchema = z.object({
  id: z.number()
});

export type SendChatMessageRequest = z.infer<typeof sendChatMessageRequestSchema>;
export type SendChatMessageResponse = z.infer<typeof sendChatMessageResponseSchema>;

// sendFrontendToolResult

export const sendFrontendToolResultRequestSchema = z.object({
  callId: z.string().min(1),
  result: z.string()
});

export type SendFrontendToolResultRequest = z.infer<typeof sendFrontendToolResultRequestSchema>;

// interruptChat

export const interruptChatRequestSchema = z.object({
  chatSessionId: z.string().min(1)
});
export type InterruptChatRequest = z.infer<typeof interruptChatRequestSchema>;

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
}
