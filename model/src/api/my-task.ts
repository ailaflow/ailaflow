import z from 'zod/v4';
import { formDefinitionSchema, jsonSchema } from '../process';

// getMyTasks

const myTaskLiteDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completedAt: z.number().optional(),
  isOutdated: z.boolean().optional()
});
export const getMyTasksResponseSchema = z.object({
  tasks: z.array(myTaskLiteDtoSchema)
});

export type MyTaskLiteDto = z.infer<typeof myTaskLiteDtoSchema>;
export type GetMyTasksResponse = z.infer<typeof getMyTasksResponseSchema>;

// getMyTaskForm

export const getMyTaskFormResponseSchema = z.object({
  form: formDefinitionSchema.nullable(),
  inputVariableNames: z.array(z.string()),
  outputVariableSchemas: z.record(z.string(), jsonSchema).nullable()
});

export type GetMyTaskFormResponse = z.infer<typeof getMyTaskFormResponseSchema>;

// submitMyTask

export const submitMyTaskRequestSchema = z.object({
  taskId: z.string(),
  outputValues: z.record(z.string(), z.unknown()),
  chatSession: z.object({
    token: z.string(),
    messageId: z.number(),
    completedMessageIndex: z.number()
  })
});

export const submitMyTaskResponseSchema = z.object({
  success: z.boolean()
});

export type SubmitMyTaskRequest = z.infer<typeof submitMyTaskRequestSchema>;
export type SubmitMyTaskResponse = z.infer<typeof submitMyTaskResponseSchema>;

// getTaskVariableValue

export const getTaskVariableValueRequestSchema = z.object({
  taskId: z.string(),
  variableName: z.string()
});

export const getTaskVariableValueResponseSchema = z.object({
  value: z.unknown().nullable()
});

export type GetTaskVariableValueRequest = z.infer<typeof getTaskVariableValueRequestSchema>;
export type GetTaskVariableValueResponse = z.infer<typeof getTaskVariableValueResponseSchema>;
