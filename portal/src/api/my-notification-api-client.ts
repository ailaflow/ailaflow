import { HttpClient } from '@aibindkit/react';
import type { DeleteMyNotificationResponse, GetMyNotificationsRequest, GetMyNotificationsResponse } from '@ailaflow/shared';

export class MyNotificationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyNotifications(abortSignal: AbortSignal, request: GetMyNotificationsRequest): Promise<GetMyNotificationsResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(abortSignal, 'GET', `/api/my-notifications?${query}`);
  }

  public deleteMyNotification(abortSignal: AbortSignal, id: string): Promise<DeleteMyNotificationResponse> {
    return this.client.json(abortSignal, 'DELETE', `/api/my-notifications/${encodeURIComponent(id)}`);
  }
}
