import { GetUsersResponse } from '@aila/model';
import { UserListQuerier } from '../../queriers/user-list/user-list-querier';
import { Endpoint } from '../endpoint';

export class GetUsersEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/users';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly querier: UserListQuerier) {}

  public async handle(): Promise<GetUsersResponse> {
    return {
      users: await this.querier.query()
    };
  }
}
