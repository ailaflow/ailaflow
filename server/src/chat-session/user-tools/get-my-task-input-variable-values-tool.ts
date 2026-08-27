import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { TaskInputVariableValuesProvider } from '../../task/task-input-variable-values-provider';
import { ChatSessionId } from '../chat-session-id';

const inputSchema = z.object({
  taskId: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class GetMyTaskInputVariableValuesTool extends ZodTool<Arg> {
  public constructor(private readonly taskInputVariableValuesProvider: TaskInputVariableValuesProvider) {
    super('get_my_task_input_variable_values', 'Returns the values of all input variables available to an assigned task', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const values = await this.taskInputVariableValuesProvider.tryGet(
      abortSignal,
      chatSessionId.isTest(),
      chatSessionId.userName,
      arg.taskId
    );
    if (!values) {
      return {
        content: {
          error: 'Task not found'
        }
      };
    }

    return {
      content: {
        values: values.getAll()
      }
    };
  }
}
