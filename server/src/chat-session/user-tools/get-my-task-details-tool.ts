import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { UserTaskDetailsProvider } from '../../task/user-task-details-provider';
import { ChatSessionId } from '../chat-session-id';
import z from 'zod/v4';

const inputSchema = z.object({
  taskId: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class GetMyTaskDetailsTool extends ZodTool<Arg> {
  public constructor(private readonly userTaskDetailsProvider: UserTaskDetailsProvider) {
    super(
      'get_my_task_details',
      'Returns task details. outputVariableSchemas maps each required top-level key of outputVariableValues in submit_my_task to the JSON Schema for that value.',
      inputSchema
    );
  }

  public async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const details = await this.userTaskDetailsProvider.tryGet(signal, chatSessionId.isTest(), chatSessionId.userName, arg.taskId);
    if (!details) {
      return {
        content: {
          error: 'Task not found'
        }
      };
    }

    return {
      content: {
        title: details.title,
        inputValues: details.getAllInputVariableValues(),
        outputVariableSchemas: details.outputVariableSchemas
      }
    };
  }
}
