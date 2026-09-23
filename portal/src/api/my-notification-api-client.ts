import { HttpClient } from '@aibindkit/react';
import type {
  DeleteAllMyNotificationsResponse,
  DeleteMyNotificationResponse,
  GetMyNotificationsRequest,
  GetMyNotificationsResponse
} from '@ailaflow/shared';

export class MyNotificationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyNotifications(signal: AbortSignal, request: GetMyNotificationsRequest): Promise<GetMyNotificationsResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(signal, 'GET', `/api/my-notifications?${query}`);
  }

  public deleteMyNotification(signal: AbortSignal, id: string): Promise<DeleteMyNotificationResponse> {
    return this.client.json(signal, 'DELETE', `/api/my-notifications/${encodeURIComponent(id)}`);
  }

  public deleteAllMyNotifications(signal: AbortSignal): Promise<DeleteAllMyNotificationsResponse> {
    return this.client.json(signal, 'DELETE', '/api/my-notifications');
  }
}
