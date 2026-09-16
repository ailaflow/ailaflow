import { saveSlackConfigurationRequestSchema } from '@ailaflow/shared';
import type { SaveSlackConfigurationResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackConfigurationManager } from '../../slack/slack-configuration-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { mapSlackEndpointErrors } from './slack-endpoint-error-mapper';

export class SaveSlackConfigurationEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/slack-configuration';
  public readonly admin = true;

  public constructor(private readonly manager: SlackConfigurationManager) {}

  public handle(req: Request): Promise<SaveSlackConfigurationResponse> {
    return mapSlackEndpointErrors(() =>
      this.manager.save(getEndpointAbortSignal(req, 20_000), parseBody(saveSlackConfigurationRequestSchema, req.body))
    );
  }
}
