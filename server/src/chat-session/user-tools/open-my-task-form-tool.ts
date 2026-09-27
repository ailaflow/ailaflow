import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { TaskFormMessageMetadata } from '@ailaflow/shared';
import * as z from 'zod/v4';
import { UserAssignedTaskProvider } from '../../task/user-assigned-task-provider';
import { ChatSessionId } from '../chat-session-id';

const inputSchema = z.object({
  taskId: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class OpenMyTaskFormTool extends ZodTool<Arg> {
  public constructor(private readonly userAssignedTaskProvider: UserAssignedTaskProvider) {
    super('open_my_task_form', 'Opens the form for a task assigned to the user', inputSchema);
  }

  protected async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const userAssignedTask = await this.userAssignedTaskProvider.tryGetCompletable(
      signal,
      chatSessionId.isTest(),
      chatSessionId.userName,
      arg.taskId
    );
    if (!userAssignedTask) {
      return {
        content: {
          error: 'Task not found'
        }
      };
    }

    const { task } = userAssignedTask;
    return {
      content: {
        success: 'The task form is displayed after this message. This form is visible only by the user.'
      },
      metadata: {
        taskForm: {
          id: task.id
        } satisfies TaskFormMessageMetadata
      }
    };
  }
}
