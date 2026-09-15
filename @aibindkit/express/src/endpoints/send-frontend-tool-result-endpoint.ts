import type { Request, Response } from 'express';
import { sendFrontendToolResultRequestSchema } from '@aibindkit/core';
import { FrontendToolBus } from '@aibindkit/llm';
import { Endpoint } from './endpoint';

const WAIT_TIME = 2_500;

export class SendFrontendToolResultEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/chat/front-end-tool';

  public constructor(private readonly bus: FrontendToolBus) {}

  public async handle(req: Request, res: Response) {
    const { data: request, error } = sendFrontendToolResultRequestSchema.safeParse(req.body);
    if (error) {
      res.status(400).json({ error: 'Invalid request body' }).end();
      return;
    }

    const abortController = new AbortController();

    const onRequestClosed = () => {
      if (!req.complete) {
        abortController.abort();
      }
    };
    const onResponseClosed = () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    };

    req.on('close', onRequestClosed);
    res.on('close', onResponseClosed);

    let success: boolean;
    try {
      success = await this.bus.sendResult(abortController.signal, WAIT_TIME, request.sessionToken, request.callId, request.result);
    } catch (e) {
      if (abortController.signal.aborted) {
        return;
      }
      throw e;
    } finally {
      req.off('close', onRequestClosed);
      res.off('close', onResponseClosed);
    }

    if (!success) {
      res
        .status(404)
        .json({ error: `Tool call ${request.callId} not found` })
        .end();
      return;
    }

    return {
      ok: true
    };
  }
}
