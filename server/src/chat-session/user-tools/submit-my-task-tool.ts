import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { ChatSessionId } from '../chat-session-id';
import z from 'zod/v4';
import { TaskResumer, TaskResumerError } from '../../task/task-resumer';

const inputSchema = z.object({
  taskId: z.string(),
  outputValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class SubmitMyTaskTool extends ZodTool<Arg> {
  public constructor(private readonly taskResumer: TaskResumer) {
    super('submit_my_task', 'Submits a task for the user', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const isTest = chatSessionId.isTest();

    try {
      await this.taskResumer.resume(abortSignal, isTest, chatSessionId.userName, arg.taskId, arg.outputValues);
    } catch (e) {
      if (e instanceof TaskResumerError) {
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
