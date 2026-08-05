import { GetMyNotificationsResponse } from '@aila/model';

export interface MyNotificationListQuerier {
  query(abortSignal: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyNotificationsResponse>;
}
