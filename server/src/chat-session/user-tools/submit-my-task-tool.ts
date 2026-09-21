import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { ChatSessionId } from '../chat-session-id';
import z from 'zod/v4';
import { AssignedTaskCompleter, AssignedTaskCompleterError } from '../../task/assigned-task-completer';

const inputSchema = z.object({
  taskId: z.string(),
  outputValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class SubmitMyTaskTool extends ZodTool<Arg> {
  public constructor(private readonly completer: AssignedTaskCompleter) {
    super('submit_my_task', 'Submits a task for the user', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const isTest = chatSessionId.isTest();

    try {
      await this.completer.complete(abortSignal, isTest, chatSessionId.userName, arg.taskId, arg.outputValues, true);
    } catch (e) {
      if (e instanceof AssignedTaskCompleterError) {
        return {
          content: {
            error: e.message
          }
        };
      }
      throw e;
    }

    return {
      content: {
        success: true
      }
    };
  }
}
