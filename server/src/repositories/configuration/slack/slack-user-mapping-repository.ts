import { Repository } from '../../repository';
import { Transaction } from '../../../core/transaction';
import { SlackUserMapping } from './slack-types';

export interface SlackMappingChangeRecord {
  slackUserId: string;
  userName: string | null;
}

export interface SlackMappingCounts {
  mapped: number;
  failedWelcome: number;
}

export interface SlackUserMappingRepository extends Repository {
  getAll(signal: AbortSignal, workspaceId?: string): Promise<SlackUserMapping[]>;
  tryGetBySlackUser(signal: AbortSignal, workspaceId: string, slackUserId: string): Promise<SlackUserMapping | null>;
  tryGetByAilaUser(signal: AbortSignal, userName: string, channelName: string): Promise<SlackUserMapping | null>;
  applyChanges(signal: AbortSignal, workspaceId: string, expectedRevision: number, changes: SlackMappingChangeRecord[]): Promise<number>;
  deleteAll(signal: AbortSignal, workspaceId: string, transaction?: Transaction): Promise<void>;
  initializeDeliveryCursor(
    signal: AbortSignal,
    workspaceId: string,
    slackUserId: string,
    generation: number,
    messageId: number
  ): Promise<boolean>;
  updateDeliveryCursorAfterReset(
    signal: AbortSignal,
    workspaceId: string,
    slackUserId: string,
    generation: number,
    messageId: number
  ): Promise<void>;
  updateDmChannelId(signal: AbortSignal, workspaceId: string, slackUserId: string, dmChannelId: string): Promise<void>;
  getWelcomeCandidates(signal: AbortSignal, now: number): Promise<SlackUserMapping[]>;
  markWelcomeAttempt(signal: AbortSignal, mapping: SlackUserMapping, nextAttemptAt: number, error: string): Promise<void>;
  markWelcomeSent(signal: AbortSignal, mapping: SlackUserMapping, dmChannelId: string, sentAt: number): Promise<void>;
  markWelcomeFailed(signal: AbortSignal, mapping: SlackUserMapping, error: string): Promise<void>;
  getCounts(signal: AbortSignal, workspaceId: string): Promise<SlackMappingCounts>;
}

export class SlackMappingRevisionConflictError extends Error {
  public constructor() {
    super('Slack mappings changed. Reload before saving again.');
    this.name = SlackMappingRevisionConflictError.name;
  }
}

export class SlackMappingValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = SlackMappingValidationError.name;
  }
}
