import { DeleteMyNotificationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { NotificationRepository } from '../../repositories/notification/notification-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteMyNotificationEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/my-notifications/:id';
  public readonly auth = true;

  public constructor(private readonly repository: NotificationRepository) {}

  public async handle(req: Request): Promise<DeleteMyNotificationResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const id = String(req.params.id);
    const deleted = await this.repository.delete(abortSignal, userName, id);
    if (!deleted) {
      throw new EndpointError('Notification not found', 404);
    }

    return { id };
  }
}
