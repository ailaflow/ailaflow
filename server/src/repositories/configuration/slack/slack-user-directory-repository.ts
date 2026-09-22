import { Repository } from '../../repository';
import { SlackDirectoryUser } from './slack-types';

export interface SlackDirectoryCounts {
  active: number;
  unavailable: number;
  lastRefreshedAt: number | null;
}

export interface SlackUserDirectoryRepository extends Repository {
  replaceFromRefresh(signal: AbortSignal, workspaceId: string, users: SlackDirectoryUser[], refreshedAt: number): Promise<void>;
  tryGet(signal: AbortSignal, workspaceId: string, slackUserId: string): Promise<SlackDirectoryUser | null>;
  getCounts(signal: AbortSignal, workspaceId: string): Promise<SlackDirectoryCounts>;
}
