import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { ChatSessionId } from '../chat-session-id';
import z from 'zod/v4';
import { TaskResumer, TaskResumerResult } from '../../task/task-resumer';

const inputSchema = z.object({
  taskId: z.string(),
  values: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class SubmitMyTaskTool extends ZodTool<Arg> {
  public constructor(private readonly taskResumer: TaskResumer) {
    super('submit_my_task', 'Submits a task for the user', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const isTest = chatSessionId.isTest();
    const result = await this.taskResumer.resume(abortSignal, isTest, chatSessionId.userName, arg.taskId, arg.values);
    if (result === TaskResumerResult.TASK_NOT_FOUND) {
      return {
        content: {
          error: 'Cannot find the task, or you do not have access to it'
        }
      };
    }
    return {
      content: {
        success: true
      }
    };
  }
}
