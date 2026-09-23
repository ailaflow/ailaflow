import { changeMyPasswordRequestSchema } from '@ailaflow/shared';
import type { ChangeMyPasswordResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { Cipher } from '../../core/cipher/cipher';
import { UserRepository, UserRepositoryError } from '../../repositories/user/user-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class ChangeMyPasswordEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-configuration/password';
  public readonly auth = true;

  public constructor(
    private readonly userRepository: UserRepository,
    private readonly cipher: Cipher
  ) {}

  public async handle(req: Request): Promise<ChangeMyPasswordResponse> {
    const signal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const request = parseBody(changeMyPasswordRequestSchema, req.body);
    const user = await this.userRepository.tryGetUser(signal, userName);

    if (!user) {
      throw new EndpointError('User not found', 404);
    }
    if (!(await user.comparePassword(request.currentPassword, this.cipher))) {
      throw new EndpointError('Current password is incorrect', 400);
    }

    try {
      await user.setPassword(request.newPassword, this.cipher);
      await this.userRepository.update(signal, user);
    } catch (error) {
      if (error instanceof UserRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }

    return {};
  }
}
