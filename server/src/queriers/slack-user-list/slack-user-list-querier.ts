import type { GetSlackUsersResponse } from '@ailaflow/shared';

export interface SlackUserListQuerier {
  query(signal: AbortSignal, workspaceId: string, page: number, pageSize: number, search?: string): Promise<GetSlackUsersResponse>;
}
