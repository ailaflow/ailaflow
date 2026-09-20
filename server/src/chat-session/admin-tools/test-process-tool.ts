import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessManager } from '../../process/process-manager';
import { ChatSessionId } from '../chat-session-id';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { ProcessExecutionOutcomeType } from '@ailaflow/shared';
import { EventBus } from '../../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../../events/process-execution/process-execution-finished-event';

const inputSchema = z.object({
  name: z.string(),
  startVariableValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class TestProcessTool extends ZodTool<Arg> {
  public constructor(
    private readonly processManager: ProcessManager,
    private readonly processExecutor: ProcessExecutor,
    private readonly eventBus: EventBus
  ) {
    super('global_test_process', 'Tests a process', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    const process = await this.processManager.tryGetByName(abortSignal, arg.name);
    if (!process) {
      return {
        content: {
          error: `Cannot find the "${arg.name}" process`
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
      isTest: true
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

      let m = `Process /${arg.name} started successfully. Execution ID: "${execution.id}"\n`;
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
