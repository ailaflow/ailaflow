import { Request } from 'express';
import { MyProcessProvider } from '../../my-process/my-process-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-body';
import { startMyProcessRequestSchema, StartMyProcessResponse } from '@aila/model';
import { LazyProcessExecutor } from '../../process-executor/lazy-process-executor';
import { EndpointError } from '../framework/endpoint-error';
import { LiveChatSessionStore } from '@aibindkit/express';

export class StartMyProcessEndpoint implements Endpoint {
  public readonly method = 'post';
  public readonly path = '/api/my-processes/:name/start';
  public readonly auth = true;

  public constructor(
    private readonly myProcessProvider: MyProcessProvider,
    private readonly lazyProcessExecutor: LazyProcessExecutor,
    private readonly liveSessionStore: LiveChatSessionStore
  ) {}

  public async handle(req: Request): Promise<StartMyProcessResponse> {
    const abortSignal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(startMyProcessRequestSchema, req.body);

    const processName = String(req.params.name);
    const process = await this.myProcessProvider.tryGet(abortSignal, authToken.userName, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    const chatSession = this.liveSessionStore.tryGetByToken(request.chatSession.token);
    if (!chatSession) {
      throw new EndpointError('Chat session not found', 404);
    }

    // TODO: validation

    const result = await this.lazyProcessExecutor.execute(abortSignal, null, authToken.userName, process, request.startValues);
    if (result.finished) {
      throw new Error('Unexpected behavior');
    }

    chatSession.setMetadata(request.chatSession.messageId, request.chatSession.completedMessageIndex, 'finished', true);

    return {
      executionId: result.executionId
    };
  }
}
