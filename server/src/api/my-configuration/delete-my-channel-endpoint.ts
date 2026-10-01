import type { DeleteMyChannelResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { UserChannelRepository } from '../../repositories/user-channel/user-channel-repository';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { EndpointError } from '../framework/endpoint-error';

export class DeleteMyChannelEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/my-configuration/channels/:name';
  public readonly auth = true;

  public constructor(private readonly repository: UserChannelRepository) {}

  public async handle(req: Request): Promise<DeleteMyChannelResponse> {
    const signal = getEndpointAbortSignal(req);
    const userName = getAuthToken(req).userName;
    const channelName = String(req.params.name);
    const channel = await this.repository.tryGet(signal, userName, channelName);
    if (!channel) {
      throw new EndpointError('Channel not found', 404);
    }
    if (channel.isDefault) {
      throw new EndpointError('The default channel cannot be deleted', 400);
    }

    await this.repository.delete(signal, userName, channelName);
    return {};
  }
}
