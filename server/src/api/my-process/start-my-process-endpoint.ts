import { Request, Response } from 'express';
import { UserProcessProvider } from '../../process/user-process-provider';
import { getAuthToken } from '../auth/auth-middleware';
import { Endpoint } from '../framework/endpoint';
import { getEndpointAbortSignal } from '../framework/endpoint-abort-signal';
import { parseBody } from '../framework/parse-request';
import {
  ProcessExecutionOutcomeType,
  ReturnStep,
  StartMyProcessRequest,
  startMyProcessRequestSchema,
  StartMyProcessUpdate
} from '@ailaflow/shared';
import { EndpointError } from '../framework/endpoint-error';
import { ChatSessionManager } from '@aibindkit/express';
import { ProcessExecutionContext, ProcessExecutionTrigger } from '../../process-executor/process-execution-context';
import { ChatSession } from '@aibindkit/llm';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { SseResponse } from '../../core/sse-response';
import { Logger } from '../../core/logger';
import { DefinitionWalker } from 'sequential-workflow-model';
import { ExecutionTaskCandidateQuerier } from '../../queriers/my-task-list/execution-task-candidate-querier';

export class StartMyProcessEndpoint implements Endpoint {
  private readonly logger = new Logger(StartMyProcessEndpoint.name);

  public readonly method = 'post';
  public readonly path = '/api/my-processes/:name/start';
  public readonly auth = true;

  public constructor(
    private readonly userProcessProvider: UserProcessProvider,
    private readonly processExecutor: ProcessExecutor,
    private readonly chatSessionManager: ChatSessionManager,
    private readonly taskCandidateQuerier: ExecutionTaskCandidateQuerier
  ) {}

  public async handle(req: Request, res: Response) {
    const signal = getEndpointAbortSignal(req);
    const authToken = getAuthToken(req);
    const request = parseBody(startMyProcessRequestSchema, req.body);

    const processName = String(req.params.name);
    const process = await this.userProcessProvider.tryGet(signal, authToken.userName, processName);
    if (!process) {
      throw new EndpointError('Process not found', 404);
    }

    const startValuesError = process.variables.validateStartValues(request.startValues);
    if (startValuesError) {
      throw new EndpointError(startValuesError, 400);
    }

    const context: ProcessExecutionContext = {
      trigger: ProcessExecutionTrigger.ENDPOINT,
      isTest: false,
      startedBy: authToken.userName
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
    const sseResponse = new SseResponse<StartMyProcessUpdate>(res);
    sseResponse.onClose(() => execution.tryStop());

    execution.onCurrentStepChanged.subscribe(_ => {
      sseResponse.send({ stepChanged: true });
    });
    execution.onOutcome.subscribe(async outcome => {
      const update: StartMyProcessUpdate = { outcome };

      if (outcome.type === ProcessExecutionOutcomeType.FINISHED && outcome.interruptedStepId) {
        const walker = new DefinitionWalker();
        const step = walker.findById(process.definition, outcome.interruptedStepId);
        if (step && step.type === 'return') {
          update.form = (step as ReturnStep).properties.outputForm;
        }
      } else if (outcome.type === ProcessExecutionOutcomeType.PAUSED) {
        update.candidateTaskIds = await this.tryResolveCandidateTaskIds(signal, execution.id, authToken.userName);
      }

      sseResponse.send(update);
      res.end();

      if (chatSession && request.chatSession) {
        void this.finishMessageOnBackground(chatSession, request);
      }
    });

    execution.run();
  }

  private async tryResolveCandidateTaskIds(signal: AbortSignal, executionId: string, userName: string): Promise<string[] | undefined> {
    try {
      return await this.taskCandidateQuerier.query(signal, executionId, userName, false, Date.now(), 2);
    } catch (e) {
      this.logger.error(`Failed to resolve candidate task IDs: ${(e as Error)?.message ?? e}`);
    }
    return undefined;
  }

  private async finishMessageOnBackground(chatSession: ChatSession, request: StartMyProcessRequest) {
    if (request.chatSession) {
      try {
        const signal = AbortSignal.timeout(3_000);
        await chatSession.setMetadata(
          signal,
          { id: request.chatSession.messageId, completedMessageIndex: request.chatSession.completedMessageIndex },
          'finished',
          true
        );
      } catch (e) {
        this.logger.error(`Failed to finish message on background: ${(e as Error)?.message ?? e}`);
      }
    }
  }
}
