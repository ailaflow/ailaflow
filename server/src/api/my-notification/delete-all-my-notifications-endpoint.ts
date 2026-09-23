import { DeleteAllMyNotificationsResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { NotificationRepository } from '../../repositories/notification/notification-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class DeleteAllMyNotificationsEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/my-notifications';
  public readonly auth = true;

  public constructor(private readonly repository: NotificationRepository) {}

  public async handle(req: Request): Promise<DeleteAllMyNotificationsResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const deletedCount = await this.repository.deleteAll(signal, userName);
    return { deletedCount };
  }
}
