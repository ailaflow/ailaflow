import z from 'zod/v4';
import type { ToolDescriptor } from '@aibindkit/model';
import { CompletedMessage, MessageType } from '../chat-session';

// restoreChat

export const restoreChatRequestSchema = z.object({
  admin: z
    .object({
      hash: z.string(),
      frontendToolDescriptors: z.array(z.custom<ToolDescriptor>())
    })
    .optional(),
  user: z
    .object({
      channelName: z.string()
    })
    .optional()
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
