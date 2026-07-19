import { updateUserRequestSchema, UpdateUserResponse } from '@aila/model';
import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { parseBody } from '../parse-body';
import { UserRepository, UserRepositoryError } from '../../repositories/user-repository/user-repository';
import {
  UserAttributesRepository,
  UserAttributesRepositoryError
} from '../../repositories/user-attributes-repository/user-attributes-repository';
import { UserAttributes } from '../../repositories/user-attributes-repository/user-attributes';
import { PasswordHasher } from '../../repositories/user-repository/password-hasher';
import { EndpointError } from '../endpoint-error';

export class UpdateUserEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/user';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<UpdateUserResponse> {
    const request = parseBody(updateUserRequestSchema, req.body);

    const user = await this.userRepository.tryGetById(request.id);
    if (!user) {
      throw new EndpointError('User not found', 404);
    }

    if (request.password) {
      await user.setPassword(request.password, this.passwordHasher);
    }
    user.setName(request.name);
    user.setIsAdmin(request.isAdmin);

    let attributes: UserAttributes;
    try {
      attributes = UserAttributes.create(user, request.attributes);
    } catch (e) {
      if (e instanceof Error) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    try {
      await this.userRepository.update(user);
      await this.userAttributesRepository.replace(attributes);
    } catch (e) {
      if (e instanceof UserRepositoryError || e instanceof UserAttributesRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {
      id: user.id
    };
  }
}
