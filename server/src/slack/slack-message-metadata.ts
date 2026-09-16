export enum SlackMessageStatus {
  SENDING = 1,
  SENT = 2,
  FAILED = 3
}

export interface SlackMessageOrigin {
  eventId: string;
  workspaceId: string;
  slackUserId: string;
  channelId: string;
  messageTs: string;
  mappingGeneration: number;
}

export interface SlackMessageDelivery {
  status: SlackMessageStatus;
  updatedAt: number;
  attemptCount: number;
  slackMessageTimestamps: string[];
  nextChunkIndex: number;
  mappingGeneration: number;
  lastError?: string;
}

export interface SlackMessageMetadata {
  origin?: SlackMessageOrigin;
  delivery?: SlackMessageDelivery;
}

export function tryGetSlackMessageMetadata(metadata: Record<string, unknown> | undefined): SlackMessageMetadata | null {
  return (metadata?.['slack'] as SlackMessageMetadata | undefined) ?? null;
}
