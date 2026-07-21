import type { Request, Response } from 'express';
import { sendFrontendToolResultRequestSchema } from '@aibindkit/core';
import { FrontendToolBus } from '@aibindkit/llm';
import { Endpoint } from './endpoint';

export class SendFrontendToolResultEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/front-end-tool';

  public constructor(private readonly bus: FrontendToolBus) {}

  public handle(req: Request, res: Response) {
    const { data: request, error } = sendFrontendToolResultRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    if (!this.bus.sendResult(request.sessionToken, request.callId, request.result)) {
      res.status(404).json({ error: 'Call ID not found' }).end();
      return;
    }

    return {
      ok: true
    };
  }
}
