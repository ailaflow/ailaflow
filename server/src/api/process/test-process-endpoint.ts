import { ProcessLogLevel, testProcessRequestSchema, TestProcessUpdate } from '@aila/model';
import { SseResponse } from '../../utilities/sse-response';
import { Endpoint } from '../framework/endpoint';
import { Request, Response } from 'express';
import { ProcessRepository } from '../../repositories/process/process-repository';
import { EndpointError } from '../framework/endpoint-error';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { getAuthToken } from '../auth/auth-middleware';
import { ProcessExecutionOrigin } from '../../process-executor/process-execution';

export class TestProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/processes/:name/test';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly processExecutor: ProcessExecutor
  ) {}

  public async handle(req: Request, res: Response) {
    const endpointAbortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const processName = String(req.params.name);
    const request = parseBody(testProcessRequestSchema, req.body);
    const process = await this.processRepository.tryGetByName(endpointAbortSignal, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    const origin: ProcessExecutionOrigin = {
      startedBy: userName
    };
    // We need to initialize the workflow machine before sending SSE headers.
    // If the workflow machine fails, the user will receive the expected HTTP 500 response.
    const execution = this.processExecutor.initialize(origin, process, request.input);

    const abortController = new AbortController();
    const sseResponse = new SseResponse<TestProcessUpdate>(res);
    sseResponse.onClose(() => abortController.abort());

    execution.onCurrentStepChanged.subscribe(stepId => {
      // TODO
      sseResponse.send({ log: [Date.now(), ProcessLogLevel.INFO, `Current step: ${stepId}`] });
    });
    execution.onLog.subscribe(log => {
      sseResponse.send({ log });
    });
    execution.onFinished.subscribe(result => {
      sseResponse.send({ result });
      res.end();
    });
    execution.run(abortController.signal);
  }
}
