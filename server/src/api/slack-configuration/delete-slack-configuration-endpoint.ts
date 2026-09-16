import type { DeleteSlackConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackConfigurationManager } from '../../slack/slack-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class DeleteSlackConfigurationEndpoint implements Endpoint {
  public readonly method = 'delete';
  public readonly path = '/api/slack-configuration';
  public readonly admin = true;

  public constructor(private readonly manager: SlackConfigurationManager) {}

  public handle(req: Request): Promise<DeleteSlackConfigurationResponse> {
    return this.manager.delete(getEndpointAbortSignal(req));
  }
}
