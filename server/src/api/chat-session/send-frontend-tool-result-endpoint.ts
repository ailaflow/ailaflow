import { Request } from 'express';
import { Endpoint } from '../endpoint';
import { EndpointError } from '../endpoint-error';
import { sendFrontendToolResultRequestSchema } from '@aibindkit/model';
import { FrontendToolBus } from '@aibindkit/llm';
import { parseBody } from '../parse-body';

export class SendFrontedToolResultEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/front-end-tool';
  public readonly auth = true;

  public constructor(private readonly bus: FrontendToolBus) {}

  public async handle(req: Request): Promise<{}> {
    const request = parseBody(sendFrontendToolResultRequestSchema, req.body);

    if (!this.bus.sendResult(request.callId, request.result)) {
      throw new EndpointError('Cannot find call', 404);
    }

    return {};
  }
}
