import type { GetSlackConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackConfigurationManager } from '../../slack/slack-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetSlackConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/slack-configuration';
  public readonly admin = true;

  public constructor(private readonly manager: SlackConfigurationManager) {}

  public handle(req: Request): Promise<GetSlackConfigurationResponse> {
    return this.manager.get(getEndpointAbortSignal(req));
  }
}
