export interface SlackConfiguration {
  appToken: string;
  botToken: string;
  appId: string;
  workspaceId: string;
  workspaceName: string;
  botUserId: string;
  mappingRevision: number;
  configuredAt: number;
  updatedAt: number;
}

export interface SlackDirectoryUser {
  workspaceId: string;
  slackUserId: string;
  legacyName: string | null;
  displayName: string | null;
  realName: string | null;
  email: string | null;
  isDeleted: boolean;
  isBot: boolean;
  isAppUser: boolean;
  lastSeenAt: number;
  updatedAt: number;
}

export enum SlackMappingWelcomeStatus {
  PENDING = 1,
  SENT = 2,
  FAILED = 3
}

export interface SlackUserMapping {
  workspaceId: string;
  slackUserId: string;
  userName: string;
  channelName: 'default';
  generation: number;
  deliveryStartMessageId: number | null;
  dmChannelId: string | null;
  welcomeStatus: SlackMappingWelcomeStatus;
  welcomeAttemptCount: number;
  welcomeNextAttemptAt: number | null;
  welcomeSentAt: number | null;
  welcomeLastError: string | null;
  createdAt: number;
  updatedAt: number;
}

export enum SlackInboundEventStatus {
  PENDING = 1,
  PROCESSED = 2,
  FAILED = 3
}

export interface SlackInboundEvent {
  eventId: string;
  workspaceId: string;
  slackUserId: string;
  slackChannelId: string;
  slackMessageTs: string;
  text: string | null;
  eventPayload: string;
  status: SlackInboundEventStatus;
  attemptCount: number;
  nextAttemptAt: number | null;
  lastError: string | null;
  receivedAt: number;
  processedAt: number | null;
}
