import { GetMyNotificationsResponse } from '@ailaflow/shared';

export interface MyNotificationListQuerier {
  query(signal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyNotificationsResponse>;
}
