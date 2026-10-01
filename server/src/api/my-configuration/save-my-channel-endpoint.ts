import { saveMyChannelRequestSchema } from '@ailaflow/shared';
import type { SaveMyChannelResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { UserChannelRepository, UserChannelRepositoryError } from '../../repositories/user-channel/user-channel-repository';
import { UserChannel } from '../../repositories/user-channel/user-channel';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';
import { parseBody } from '../framework/parse-request';

export class SaveMyChannelEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-configuration/channels';
  public readonly auth = true;

  public constructor(private readonly repository: UserChannelRepository) {}

  public async handle(req: Request): Promise<SaveMyChannelResponse> {
    const signal = getEndpointAbortSignal(req);
    const userName = getAuthToken(req).userName;
    const request = parseBody(saveMyChannelRequestSchema, req.body);
    const existingChannel = await this.repository.tryGet(signal, userName, request.name);

    try {
      let channel: UserChannel;
      if (request.insert) {
        if (existingChannel) {
          throw new EndpointError(`Channel "${request.name}" already exists`, 400);
        }
        if (!request.isDefault && !(await this.repository.get(signal, userName))) {
          throw new EndpointError('The first channel must be the default', 400);
        }
        channel = UserChannel.create(userName, request.name, request.prompt, request.isDefault);
      } else {
        if (!existingChannel) {
          throw new EndpointError(`Channel "${request.name}" not found`, 404);
        }
        if (existingChannel.isDefault && !request.isDefault) {
          throw new EndpointError('The default channel cannot be unset', 400);
        }
        channel = existingChannel;
        channel.setPrompt(request.prompt);
        channel.setIsDefault(request.isDefault);
      }
      await this.repository.upsert(signal, channel);
    } catch (error) {
      if (error instanceof UserChannelRepositoryError) {
        throw new EndpointError(error.message, 400);
      }
      throw error;
    }

    return {};
  }
}
