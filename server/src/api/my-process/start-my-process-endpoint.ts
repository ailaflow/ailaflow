import { Request } from 'express';
import { UserProcessProvider } from '../../process/user-process-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import { startMyProcessRequestSchema, StartMyProcessResponse } from '@aila/model';
import { LazyProcessExecutor } from '../../process-executor/lazy-process-executor';
import { EndpointError } from '../framework/endpoint-error';
import { ChatSessionManager } from '@aibindkit/express';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';

export class StartMyProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-processes/:name/start';
  public readonly auth = true;

  public constructor(
    private readonly userProcessProvider: UserProcessProvider,
    private readonly lazyProcessExecutor: LazyProcessExecutor,
    private readonly chatSessionManager: ChatSessionManager
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

    const chatSession = this.chatSessionManager.tryGetByToken(request.chatSession.token);
    if (!chatSession) {
      throw new EndpointError('Chat session not found', 404);
    }

    const context: ProcessExecutionContext = {
      startedBy: authToken.userName,
      chatSessionId: chatSession.id,
      isTest: false
    };
    const result = await this.lazyProcessExecutor.execute(abortSignal, null, context, process, request.startValues);
    if (result.finished) {
      throw new Error('Unexpected behavior');
    }

    await chatSession.setMetadata(request.chatSession.messageId, request.chatSession.completedMessageIndex, 'finished', true);

    return {
      executionId: result.executionId
    };
  }
}
