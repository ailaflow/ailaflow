import { GetUsersResponse } from '@aila/model';

export interface UserListQuerier {
  query(abortSignal: AbortSignal, page: number, pageSize: number, search?: string): Promise<GetUsersResponse>;
}
