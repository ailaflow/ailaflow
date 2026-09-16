import type { RefreshSlackUsersResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackUserDirectoryRefresher } from '../../slack/slack-user-directory-refresher';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { mapSlackEndpointErrors } from './slack-endpoint-error-mapper';

export class RefreshSlackUsersEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/slack-configuration/users/refresh';
  public readonly admin = true;

  public constructor(private readonly refresher: SlackUserDirectoryRefresher) {}

  public handle(req: Request): Promise<RefreshSlackUsersResponse> {
    return mapSlackEndpointErrors(() => this.refresher.refresh(getEndpointAbortSignal(req, 60_000)));
  }
}
