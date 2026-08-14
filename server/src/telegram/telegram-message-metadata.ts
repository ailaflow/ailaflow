export enum TelegramMessageStatus {
  SENDING = 1,
  SENT = 2,
  FAILED = 3
}

export interface TelegramMessageOrigin {
  updateId: number;
  chatId: string;
  messageId: number;
}

export interface TelegramMessageDelivery {
  status: TelegramMessageStatus;
  updatedAt: number;
  attemptCount: number;
  telegramMessageIds: number[];
  nextChunkIndex: number;
  lastError?: string;
}

export interface TelegramMessageMetadata {
  origin?: TelegramMessageOrigin;
  delivery?: TelegramMessageDelivery;
}

export function tryGetTelegramMessageMetadata(metadata: Record<string, unknown> | undefined): TelegramMessageMetadata | null {
  const telegram = metadata?.['telegram'] as TelegramMessageMetadata | undefined;
  return telegram ?? null;
}
