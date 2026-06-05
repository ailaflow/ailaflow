import z from 'zod';
import { CompletedMessage, MessageType, ToolDescriptor } from '../chat-session';

// restoreChat

export const restoreChatRequest = z.object({
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
export type RestoreChatRequest = z.infer<typeof restoreChatRequest>;

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

export const sendChatMessageRequest = z.object({
  chatSessionId: z.string().min(1),
  message: z.string().min(1)
});
export const sendChatMessageResponse = z.object({
  id: z.number()
});

export type SendChatMessageRequest = z.infer<typeof sendChatMessageRequest>;
export type SendChatMessageResponse = z.infer<typeof sendChatMessageResponse>;

// sendFrontendToolResult

export const sendFrontendToolResultRequest = z.object({
  callId: z.string().min(1),
  result: z.string()
});

export type SendFrontendToolResultRequest = z.infer<typeof sendFrontendToolResultRequest>;
