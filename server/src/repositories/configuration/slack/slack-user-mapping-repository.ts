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
  getAll(abortSignal: AbortSignal, workspaceId?: string): Promise<SlackUserMapping[]>;
  tryGetBySlackUser(abortSignal: AbortSignal, workspaceId: string, slackUserId: string): Promise<SlackUserMapping | null>;
  tryGetByAilaUser(abortSignal: AbortSignal, userName: string, channelName: string): Promise<SlackUserMapping | null>;
  applyChanges(
    abortSignal: AbortSignal,
    workspaceId: string,
    expectedRevision: number,
    changes: SlackMappingChangeRecord[]
  ): Promise<number>;
  deleteAll(abortSignal: AbortSignal, workspaceId: string, transaction?: Transaction): Promise<void>;
  initializeDeliveryCursor(
    abortSignal: AbortSignal,
    workspaceId: string,
    slackUserId: string,
    generation: number,
    messageId: number
  ): Promise<boolean>;
  updateDeliveryCursorAfterReset(
    abortSignal: AbortSignal,
    workspaceId: string,
    slackUserId: string,
    generation: number,
    messageId: number
  ): Promise<void>;
  updateDmChannelId(abortSignal: AbortSignal, workspaceId: string, slackUserId: string, dmChannelId: string): Promise<void>;
  getWelcomeCandidates(abortSignal: AbortSignal, now: number): Promise<SlackUserMapping[]>;
  markWelcomeAttempt(abortSignal: AbortSignal, mapping: SlackUserMapping, nextAttemptAt: number, error: string): Promise<void>;
  markWelcomeSent(abortSignal: AbortSignal, mapping: SlackUserMapping, dmChannelId: string, sentAt: number): Promise<void>;
  markWelcomeFailed(abortSignal: AbortSignal, mapping: SlackUserMapping, error: string): Promise<void>;
  getCounts(abortSignal: AbortSignal, workspaceId: string): Promise<SlackMappingCounts>;
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
