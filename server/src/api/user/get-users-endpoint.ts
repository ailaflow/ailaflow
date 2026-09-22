import { GetUsersResponse, getUsersRequestSchema } from '@ailaflow/shared';
import { UserListQuerier } from '../../queriers/user-list/user-list-querier';
import { Endpoint } from '../framework/endpoint';
import { Request } from 'express';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';

export class GetUsersEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/users';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: UserListQuerier) {}

  public async handle(req: Request): Promise<GetUsersResponse> {
    const signal = getEndpointAbortSignal(req);
    const { page, pageSize, onlyActive, search } = parseQuery(getUsersRequestSchema, req.query);
    return this.querier.query(signal, page, pageSize, onlyActive ?? false, search);
  }
}
