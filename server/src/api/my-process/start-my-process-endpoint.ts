import { Request } from 'express';
import { UserProcessProvider } from '../../process/user-process-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { startMyProcessRequestSchema, StartMyProcessResponse } from '@ailaflow/shared';
import { EndpointError } from '../framework/endpoint-error';
import { ChatSessionManager } from '@aibindkit/express';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ChatSession } from '@aibindkit/llm';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { EventBus } from '../../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../../events/process-execution/process-execution-finished-event';

export class StartMyProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-processes/:name/start';
  public readonly auth = true;

  public constructor(
    private readonly userProcessProvider: UserProcessProvider,
    private readonly processExecutor: ProcessExecutor,
    private readonly chatSessionManager: ChatSessionManager,
    private readonly eventBus: EventBus
  ) {}

  public async handle(req: Request): Promise<StartMyProcessResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(startMyProcessRequestSchema, req.body);

    const processName = String(req.params.name);
    const process = await this.userProcessProvider.tryGet(abortSignal, authToken.userName, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    const startValuesError = process.variables.validateStartValues(request.startValues);
    if (startValuesError) {
      throw new EndpointError(startValuesError, 400);
    }

    const context: ProcessExecutionContext = {
      startedBy: authToken.userName,
      isTest: false
    };

    let chatSession: ChatSession | undefined;
    if (request.chatSession) {
      chatSession = this.chatSessionManager.tryGetByToken(request.chatSession.token);
      if (!chatSession) {
        throw new EndpointError('Chat session not found', 400);
      }
      context.chatSessionId = chatSession.id;
    }

    const execution = this.processExecutor.initialize(context, process, request.startValues);

    // TODO: this is duplicated
    execution.onOutcome.subscribe(outcome => {
      this.eventBus.publish(new ProcessExecutionFinishedEvent(execution.id, context, process.name, outcome));
    });

    execution.run();

    if (request.chatSession && chatSession) {
      await chatSession.setMetadata(request.chatSession.messageId, request.chatSession.completedMessageIndex, 'finished', true);
    }

    return {
      executionId: execution.id
    };
  }
}
