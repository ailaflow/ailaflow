import { GetUserResponse } from '@aila/model';
import { Request } from 'express';
import { UserRepository } from '../../repositories/user-repository/user-repository';
import { UserAttributesRepository } from '../../repositories/user-attributes-repository/user-attributes-repository';
import { Endpoint } from '../endpoint';
import { EndpointError } from '../endpoint-error';

export class GetUserEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/users/:id';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository
  ) {}

  public async handle(req: Request): Promise<GetUserResponse> {
    const userId = String(req.params.id);

    const user = await this.userRepository.tryGetById(userId);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }

    const attributes = await this.userAttributesRepository.get(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        isAdmin: user.isAdmin,
        attributes: attributes.getWithoutUserId()
      }
    };
  }
}
