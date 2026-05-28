// restoreChat

import z from 'zod';
import { CompletedMessage, MessageType } from '../chat-session';

export const restoreChatRequest = z.object({
  chatName: z.string().min(1)
});
export type RestoreChatRequest = z.infer<typeof restoreChatRequest>;

export interface ChatMessageUpdate {
  id: number;
  type: MessageType;
  failReason?: string;
  completedMessage?: CompletedMessage | CompletedMessage[];
}

export interface ChatUpdate {
  messages?: ChatMessageUpdate[];
  currentMessage?: ChatMessageUpdate;
}

// sendChatSessionMessage

export const sendChatMessageRequest = z.object({
  chatName: z.string().min(1),
  message: z.string().min(1)
});
export const sendChatMessageResponse = z.object({
  id: z.number()
});

export type SendChatMessageRequest = z.infer<typeof sendChatMessageRequest>;
export type SendChatMessageResponse = z.infer<typeof sendChatMessageResponse>;
