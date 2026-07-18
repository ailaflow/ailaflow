import { UserLiteDto } from '@aila/model';

export interface UserListQuerier {
  query(): Promise<UserLiteDto[]>;
}
