import type { GetMyChannelsResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { UserChannelRepository } from '../../repositories/user-channel/user-channel-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetMyChannelsEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-configuration/channels';
  public readonly auth = true;

  public constructor(private readonly repository: UserChannelRepository) {}

  public async handle(req: Request): Promise<GetMyChannelsResponse> {
    const channels = await this.repository.getAll(getEndpointAbortSignal(req), getAuthToken(req).userName);
    return {
      channels: channels.map(channel => ({
        name: channel.name,
        prompt: channel.prompt
      }))
    };
  }
}
