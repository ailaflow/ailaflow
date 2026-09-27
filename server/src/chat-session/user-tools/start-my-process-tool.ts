import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import * as z from 'zod/v4';
import { ChatSessionId } from '../chat-session-id';
import { UserProcessProvider } from '../../process/user-process-provider';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessExecutionMode, ProcessExecutionOutcomeType, ResourceNameNormalizer } from '@ailaflow/shared';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { EventBus } from '../../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../../events/process-execution/process-execution-finished-event';
import { ExecutionTaskCandidateQuerier } from '../../queriers/my-task-list/execution-task-candidate-querier';
import { Logger } from '../../core/logger';

const inputSchema = z.object({
  name: z.string(),
  startVariableValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class StartMyProcessTool extends ZodTool<Arg> {
  private readonly logger = new Logger(StartMyProcessTool.name);

  public constructor(
    private readonly userProcessProvider: UserProcessProvider,
    private readonly processExecutor: ProcessExecutor,
    private readonly taskCandidateQuerier: ExecutionTaskCandidateQuerier,
    private readonly eventBus: EventBus
  ) {
    super('start_my_process', 'Starts a new process', inputSchema);
  }

  protected async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSession = ChatSessionId.decode(sessionId);
    const userName = chatSession.userName;
    const isTest = chatSession.isTest();

    const processName = ResourceNameNormalizer.removePrefix(arg.name, '/');

    const process = await this.userProcessProvider.tryGet(signal, userName, processName);
    if (!process) {
      return {
        content: {
          error: `Process /${processName} was not found, or you do not have access to it.`
        }
      };
    }
    if (process.executionMode !== ProcessExecutionMode.AI_TOOL_OR_START_FORM) {
      return {
        content: {
          error: `Process /${processName} cannot be started using an AI tool. Use its start form instead.`
        }
      };
    }

    const startValuesError = process.variables.validateStartValues(arg.startVariableValues);
    if (startValuesError) {
      return {
        content: {
          error: startValuesError
        }
      };
    }

    const context: ProcessExecutionContext = {
      startedBy: userName,
      chatSessionId: sessionId,
      isTest
    };

    const execution = this.processExecutor.initialize(context, process, arg.startVariableValues);

    const softSignal = AbortSignal.any([signal, AbortSignal.timeout(6_000)]);
    const outcome = await execution.runAndWaitForOutcome(softSignal);

    if (outcome === null) {
      if (signal.aborted) {
        execution.tryStop();
        throw new Error('Operation aborted');
      }

      // TODO: this is duplicated
      execution.onOutcome.subscribe(outcome => {
        this.eventBus.publish(new ProcessExecutionFinishedEvent(execution.id, context, process.name, outcome));
      });

      let m = `Process /${processName} started successfully. Execution ID: "${execution.id}"\n`;
      m += `Process /${processName} is still running, so this tool is returning before it finishes. It will continue running in the background.\n`;
      m += `You will be notified when /${processName} finishes.`;

      return {
        content: {
          success: m
        }
      };
    }

    if (outcome.type === ProcessExecutionOutcomeType.FINISHED) {
      return {
        content: {
          outputValues: outcome.output
        }
      };
    }
    if (outcome.type === ProcessExecutionOutcomeType.PAUSED) {
      return {
        content: {
          paused: `Process /${processName} has paused (this can happen when it creates a task)`,
          candidateTaskIds: await this.tryResolveCandidateTaskIds(signal, execution.id, userName)
        }
      };
    }
    return {
      content: {
        error: outcome.error
      }
    };
  }

  private async tryResolveCandidateTaskIds(signal: AbortSignal, executionId: string, userName: string): Promise<string[] | undefined> {
    try {
      return await this.taskCandidateQuerier.query(signal, executionId, userName, false, Date.now(), 2);
    } catch (e) {
      this.logger.error(`Failed to resolve candidate task IDs: ${(e as Error)?.message ?? e}`);
    }
    return undefined;
  }
}
