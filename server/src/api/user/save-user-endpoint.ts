import { saveUserRequestSchema, SaveUserResponse } from '@ailaflow/model';
import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { UserRepository, UserRepositoryError } from '../../repositories/user/user-repository';
import { UserAttributesRepository, UserAttributesRepositoryError } from '../../repositories/user-attributes/user-attributes-repository';
import { UserAttributes } from '../../repositories/user-attributes/user-attributes';
import { PasswordHasher } from '../../repositories/user/password-hasher';
import { EndpointError } from '../framework/endpoint-error';
import { User } from '../../repositories/user/user';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class SaveUserEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/user';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  public async handle(req: Request): Promise<SaveUserResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const request = parseBody(saveUserRequestSchema, req.body);

    const existingUser = await this.userRepository.tryGetUser(abortSignal, request.name);
    let user: User;
    if (request.insert) {
      if (existingUser) {
        throw new EndpointError('User already exists', 400);
      }
      if (!request.password) {
        throw new EndpointError('Password is required to create a user', 400);
      }
      try {
        user = await User.create(request.name, request.password, request.isAdmin, this.passwordHasher);
      } catch (e) {
        if (e instanceof UserRepositoryError) {
          throw new EndpointError(e.message, 400);
        }
        throw e;
      }
    } else {
      if (!existingUser) {
        throw new EndpointError('User not found', 404);
      }
      user = existingUser;
    }

    if (request.password) {
      await user.setPassword(request.password, this.passwordHasher);
    }
    user.setIsAdmin(request.isAdmin);

    let attributes: UserAttributes;
    try {
      attributes = UserAttributes.create(user, request.attributes);
    } catch (e) {
      if (e instanceof UserAttributesRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    try {
      if (request.insert) {
        await this.userRepository.insert(abortSignal, user);
      } else {
        await this.userRepository.update(abortSignal, user);
      }
      await this.userAttributesRepository.replace(abortSignal, attributes);
    } catch (e) {
      if (e instanceof UserRepositoryError || e instanceof UserAttributesRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    return {
      name: user.name
    };
  }
}
