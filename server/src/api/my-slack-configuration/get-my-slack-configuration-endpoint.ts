import type { MySlackConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackStatusProvider } from '../../slack/slack-status-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';

export class GetMySlackConfigurationEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/my-slack-configuration';
  public readonly auth = true;

  public constructor(private readonly statusProvider: SlackStatusProvider) {}

  public handle(req: Request): Promise<MySlackConfigurationResponse> {
    return this.statusProvider.get(getEndpointAbortSignal(req), getAuthToken(req).userName);
  }
}
