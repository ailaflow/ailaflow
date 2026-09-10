import { ProcessExecutionResult, ProcessLog, testProcessRequestSchema, TestProcessUpdate } from '@ailaflow/shared';
import { SseResponse } from '../../utilities/sse-response';
import { Endpoint } from '../framework/endpoint';
import { Request, Response } from 'express';
import { ProcessManager } from '../../process/process-manager';
import { EndpointError } from '../framework/endpoint-error';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { parseBody } from '../framework/parse-request';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { getAuthToken } from '../auth/auth-middleware';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessExecutionResumeListenerStore } from '../../process-executor/process-execution-resume-listener-store';
import { ProcessExecution } from '../../process-executor/process-execution';

export class TestProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/processes/:name/test';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(
    private readonly processManager: ProcessManager,
    private readonly processExecutor: ProcessExecutor,
    private readonly resumeListenerStore: ProcessExecutionResumeListenerStore
  ) {}

  public async handle(req: Request, res: Response) {
    const endpointAbortSignal = getEndpointAbortSignal(req);
    const { userName } = getAuthToken(req);
    const processName = String(req.params.name);
    const request = parseBody(testProcessRequestSchema, req.body);
    const process = await this.processManager.tryGetByName(endpointAbortSignal, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    const context: ProcessExecutionContext = {
      startedBy: userName,
      isTest: true
    };
    // We need to initialize the workflow machine before sending SSE headers.
    // If the workflow machine fails, the user will receive the expected HTTP 500 response.
    const execution = this.processExecutor.initialize(context, process, request.input);

    const abortController = new AbortController();
    const sseResponse = new SseResponse<TestProcessUpdate>(res);
    sseResponse.onClose(() => abortController.abort());

    let lastStepId: string | null = null;

    const listen = (exec: ProcessExecution) => {
      let unsubscribed = false;

      const onCurrentStepChanged = (stepId: string | null) => {
        if (stepId && stepId !== lastStepId) {
          lastStepId = stepId;
          sseResponse.send({ currentStepId: stepId });
        }
      };
      const onLog = (log: ProcessLog) => {
        sseResponse.send({ log });
      };
      const onPaused = () => {
        unsubscribeAll();
      };
      const onFinished = (result: ProcessExecutionResult) => {
        this.resumeListenerStore.delete(exec.id);
        unsubscribeAll();

        sseResponse.send({ result });
        res.end();
      };
      const unsubscribeAll = () => {
        if (!unsubscribed) {
          unsubscribed = true;
          exec.onCurrentStepChanged.unsubscribe(onCurrentStepChanged);
          exec.onLog.unsubscribe(onLog);
          exec.onPaused.unsubscribe(onPaused);
          exec.onFinished.unsubscribe(onFinished);
        }
      };

      exec.onCurrentStepChanged.subscribe(onCurrentStepChanged);
      exec.onLog.subscribe(onLog);
      exec.onPaused.subscribe(onPaused);
      exec.onFinished.subscribe(onFinished);
    };

    listen(execution);
    this.resumeListenerStore.set(execution.id, listen);

    execution.run(abortController.signal);
  }
}
