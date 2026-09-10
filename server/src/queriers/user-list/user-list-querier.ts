import { GetUsersResponse } from '@ailaflow/model';

export interface UserListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetUsersResponse>;
}
