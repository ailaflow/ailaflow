import { UserLiteDto } from '@aila/model';

export interface UserListQuerier {
  query(abortSignal: AbortSignal): Promise<UserLiteDto[]>;
}
