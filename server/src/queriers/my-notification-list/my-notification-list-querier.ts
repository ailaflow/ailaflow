import { GetMyNotificationsResponse } from '@ailaflow/shared';

export interface MyNotificationListQuerier {
  query(abortSignal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyNotificationsResponse>;
}
