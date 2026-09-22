import { GetMyNotificationsResponse, getMyNotificationsRequestSchema } from '@ailaflow/shared';
import { Request } from 'express';
import { MyNotificationListQuerier } from '../../queriers/my-notification-list/my-notification-list-querier';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetMyNotificationsEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-notifications';
  public readonly auth = true;

  public constructor(private readonly querier: MyNotificationListQuerier) {}

  public async handle(req: Request): Promise<GetMyNotificationsResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const { page, pageSize } = parseQuery(getMyNotificationsRequestSchema, req.query);
    return this.querier.query(signal, userName, page, pageSize);
  }
}
