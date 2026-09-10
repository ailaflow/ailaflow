import { GetUsersResponse } from '@ailaflow/shared';

export interface UserListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetUsersResponse>;
}
