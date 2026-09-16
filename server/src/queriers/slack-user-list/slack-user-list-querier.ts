import type { GetSlackUsersResponse } from '@ailaflow/shared';

export interface SlackUserListQuerier {
  query(abortSignal: AbortSignal, workspaceId: string, page: number, pageSize: number, search?: string): Promise<GetSlackUsersResponse>;
}
