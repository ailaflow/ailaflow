import { saveSlackMappingsRequestSchema } from '@ailaflow/shared';
import type { SaveSlackMappingsResponse } from '@ailaflow/shared';
import { Request } from 'express';
import { SlackMappingManager } from '../../slack/slack-mapping-manager';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { mapSlackEndpointErrors } from './slack-endpoint-error-mapper';

export class SaveSlackMappingsEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/slack-configuration/mappings';
  public readonly admin = true;

  public constructor(private readonly manager: SlackMappingManager) {}

  public handle(req: Request): Promise<SaveSlackMappingsResponse> {
    return mapSlackEndpointErrors(() =>
      this.manager.save(getEndpointAbortSignal(req), parseBody(saveSlackMappingsRequestSchema, req.body))
    );
  }
}
