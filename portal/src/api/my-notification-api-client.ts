import { HttpClient } from '@aibindkit/react';
import type { GetMyNotificationsRequest, GetMyNotificationsResponse } from '@aila/model';

export class MyNotificationApiClient {
  public constructor(private readonly client: HttpClient) {}

  public getMyNotifications(abortSignal: AbortSignal, request: GetMyNotificationsRequest): Promise<GetMyNotificationsResponse> {
    const query = new URLSearchParams({
      page: String(request.page),
      pageSize: String(request.pageSize)
    });
    return this.client.json(abortSignal, 'GET', `/api/my-notifications?${query}`);
  }
}
