import { GetMyNotificationsResponse } from '@ailaflow/model';

export interface MyNotificationListQuerier {
  query(abortSignal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyNotificationsResponse>;
}
