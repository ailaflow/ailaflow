import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessManager } from '../../process/process-manager';
import { ChatSessionId } from '../chat-session-id';
import { ProcessExecutor } from '../../process-executor/process-executor';
import { ProcessExecutionMode, ProcessExecutionOutcomeType, ResourceNameNormalizer } from '@ailaflow/shared';
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

  public async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    const processName = ResourceNameNormalizer.removePrefix(arg.name, '/');
    const process = await this.processManager.tryGetByName(signal, processName);
    if (!process) {
      return {
        content: {
          error: `Process /${processName} was not found.`
        }
      };
    }
    if (process.executionMode !== ProcessExecutionMode.AI_TOOL_OR_START_FORM) {
      return {
        content: {
          error: `Process /${processName} cannot be tested using an AI tool. Its execution mode is start-form only.`
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

      let m = `Test execution of /${processName} started successfully. Execution ID: "${execution.id}"\n`;
      m += `The test execution is still running, so this tool is returning before it finishes. It will continue running in the background.\n`;
      m += `You will be notified when the test execution of /${processName} finishes.`;

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
          paused: `Test execution of /${processName} has paused (this can happen when the process creates a task).`
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
