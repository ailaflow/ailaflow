import { getSlackUsersRequestSchema } from '@ailaflow/shared';
import type { GetSlackUsersResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackMappingManager } from '../../slack/slack-mapping-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseQuery } from '../framework/parse-request';
import { mapSlackEndpointErrors } from './slack-endpoint-error-mapper';

export class GetSlackUsersEndpoint implements Endpoint {
  public readonly method = 'get';
  public readonly path = '/api/slack-configuration/users';
  public readonly admin = true;

  public constructor(private readonly manager: SlackMappingManager) {}

  public handle(req: Request): Promise<GetSlackUsersResponse> {
    return mapSlackEndpointErrors(() => this.manager.list(getEndpointAbortSignal(req), parseQuery(getSlackUsersRequestSchema, req.query)));
  }
}
