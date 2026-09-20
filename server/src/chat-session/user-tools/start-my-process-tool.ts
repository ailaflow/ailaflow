import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ChatSessionId } from '../chat-session-id';
import { UserProcessProvider } from '../../process/user-process-provider';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessExecutionOutcomeType, ResourceNameNormalizer } from '@ailaflow/shared';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { EventBus } from '../../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../../events/process-execution/process-execution-finished-event';

const inputSchema = z.object({
  name: z.string(),
  startVariableValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class StartMyProcessTool extends ZodTool<Arg> {
  public constructor(
    private readonly userProcessProvider: UserProcessProvider,
    private readonly processExecutor: ProcessExecutor,
    private readonly eventBus: EventBus
  ) {
    super('start_my_process', 'Starts a new process', inputSchema);
  }

  protected async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSession = ChatSessionId.decode(sessionId);
    const userName = chatSession.userName;
    const isTest = chatSession.isTest();

    const processName = ResourceNameNormalizer.removePrefix(arg.name, '/');

    const process = await this.userProcessProvider.tryGet(abortSignal, userName, processName);
    if (!process) {
      return {
        content: {
          error: `Cannot find /${processName} process, or you do not have access to it`
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

    const softSignal = AbortSignal.any([abortSignal, AbortSignal.timeout(6_000)]);
    const outcome = await execution.runAndWaitForOutcome(softSignal);

    if (outcome === null) {
      if (abortSignal.aborted) {
        execution.tryStop();
        throw new Error('Operation aborted');
      }

      // TODO: this is duplicated
      execution.onOutcome.subscribe(outcome => {
        this.eventBus.publish(new ProcessExecutionFinishedEvent(execution.id, context, process.name, outcome));
      });

      let m = `Process /${processName} started successfully. Execution ID: "${execution.id}"\n`;
      m += `The process is still running, so this tool is returning before it finishes. Execution will continue in the background.\n`;
      m += `The system will notify you when the process finishes.`;

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
          paused: 'The execution of the process has been paused (this may happen if a task was created)'
        }
      };
    }
    return {
      content: {
        error: outcome.error
      }
    };
  }
}
