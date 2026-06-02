import { testProcessRequest, TestProcessUpdate } from '@aila/model';
import { SseResponse } from '../../core/sse-response';
import { Endpoint } from '../endpoint';
import { Request, Response } from 'express';

export class TestProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/processes/:id/test';
  public readonly auth = true;
  public readonly admin = true;

  public async handle(req: Request, res: Response) {
    const request = testProcessRequest.parse(req.body);

    const sseResponse = new SseResponse<TestProcessUpdate>(res);

    sseResponse.send({ type: 'test1' });
    sseResponse.send({ type: 'test2' });
    sseResponse.send({ type: 'test3' });

    res.end();
  }
}
