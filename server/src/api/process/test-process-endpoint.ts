import { testProcessRequest, TestProcessUpdate } from '@aila/model';
import { SseResponse } from '../../core/sse-response';
import { Endpoint } from '../endpoint';
import { Request, Response } from 'express';
import { ProcessRepository } from '../../repositories/process-repository/process-repository';
import { EndpointError } from '../endpoint-error';
import { WorkflowMachine } from '../../process-executor/workflow-machine';

export class TestProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/processes/:id/test';
  public readonly auth = true;
  public readonly admin = true;

  public constructor(private readonly processRepository: ProcessRepository) {}

  public async handle(req: Request, res: Response) {
    const processId = String(req.params.id);
    const request = testProcessRequest.parse(req.body);
    const process = await this.processRepository.tryGetById(processId);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    // We need to initialize the workflow machine before sending SSE headers.
    // If the workflow machine fails, the user will receive the expected HTTP 500 response.
    const machine = WorkflowMachine.create(process.definition, request.input);

    const abortController = new AbortController();
    const sseResponse = new SseResponse<TestProcessUpdate>(res);
    sseResponse.onClose(() => abortController.abort());

    machine.onLog.subscribe(log => {
      sseResponse.send({ log });
    });
    machine.onDone.subscribe(result => {
      sseResponse.send({
        log: {
          level: 'done',
          message: JSON.stringify(result)
        }
      });
      res.end();
    });
    machine.run(abortController.signal);
  }
}
