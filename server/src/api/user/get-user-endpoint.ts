import { GetUserResponse } from '@ailaflow/model';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user/user-repository';
import { UserAttributesRepository } from '../../repositories/user-attributes/user-attributes-repository';
import { Endpoint } from '../framework/endpoint';
import { EndpointError } from '../framework/endpoint-error';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetUserEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/users/:name';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository
  ) {}

  public async handle(req: Request): Promise<GetUserResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const userName = String(req.params.name);

    const user = await this.userRepository.tryGetUser(abortSignal, userName);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }

    const attributes = await this.userAttributesRepository.get(abortSignal, user.name);

    return {
      user: {
        name: user.name,
        isAdmin: user.isAdmin,
        attributes: attributes.getWithoutUserName()
      }
    };
  }
}
