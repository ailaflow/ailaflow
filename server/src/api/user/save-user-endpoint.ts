import { saveUserRequestSchema, SaveUserResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { Endpoint } from '../framework/endpoint';
import { parseBody } from '../framework/parse-request';
import { UserRepository, UserRepositoryError } from '../../repositories/user/user-repository';
import { UserAttributesRepository, UserAttributesRepositoryError } from '../../repositories/user-attributes/user-attributes-repository';
import { UserAttributes } from '../../repositories/user-attributes/user-attributes';
import { Cipher } from '../../core/cipher/cipher';
import { EndpointError } from '../framework/endpoint-error';
import { User } from '../../repositories/user/user';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { MagicLinkRepository } from '../../repositories/auth-token/magic-link-repository';

export class SaveUserEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/user';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly userAttributesRepository: UserAttributesRepository,
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly magicLinkRepository: MagicLinkRepository,
    private readonly cipher: Cipher
  ) {}

  public async handle(req: Request): Promise<SaveUserResponse> {
    const signal = getEndpointAbortSignal(req);
    const request = parseBody(saveUserRequestSchema, req.body);

    const existingUser = await this.userRepository.tryGetUser(signal, request.name);
    let user: User;
    if (request.insert) {
      if (existingUser) {
        throw new EndpointError('User already exists', 400);
      }
      if (!request.password) {
        throw new EndpointError('Password is required to create a user', 400);
      }
      try {
        user = await User.create(request.name, request.email, request.password, request.isAdmin, this.cipher);
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

    try {
      user.setEmail(request.email);
      if (request.password) {
        await user.setPassword(request.password, this.cipher);
      }
    } catch (e) {
      if (e instanceof UserRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    const isAdminChanged = user.isAdmin !== request.isAdmin;
    user.setIsAdmin(request.isAdmin);
    user.setIsActive(request.isActive);

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
        await this.userRepository.insert(signal, user);
      } else {
        await this.userRepository.update(signal, user);
      }
      await this.userAttributesRepository.replace(signal, attributes);
    } catch (e) {
      if (e instanceof UserRepositoryError || e instanceof UserAttributesRepositoryError) {
        throw new EndpointError(e.message, 400);
      }
      throw e;
    }

    if (!request.isActive || isAdminChanged) {
      await this.authTokenRepository.deleteForUser(signal, user.name);
      await this.magicLinkRepository.deleteForUsers(signal, user.name);
    }

    return {
      name: user.name
    };
  }
}
