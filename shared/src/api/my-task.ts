import * as z from 'zod/v4';
import { formDefinitionSchema, jsonSchema } from '../process';
import { taskSubmissionModeSchema } from '../task';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getMyTasks

const myTaskLiteDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  submissionMode: taskSubmissionModeSchema,
  createdAt: z.number(),
  completedAt: z.number().optional(),
  deadline: z.number().optional()
});
export const getMyTasksRequestSchema = paginationRequestSchema.extend({
  onlyOpen: z.coerce.number().int().min(0).max(1).transform(Boolean).default(true)
});

export const getMyTasksResponseSchema = paginationResponseSchema.extend({
  tasks: z.array(myTaskLiteDtoSchema)
});

export type MyTaskLiteDto = z.infer<typeof myTaskLiteDtoSchema>;
export type GetMyTasksRequest = z.infer<typeof getMyTasksRequestSchema>;
export type GetMyTasksResponse = z.infer<typeof getMyTasksResponseSchema>;

// getMyTaskForm

export const getMyTaskFormRequestSchema = z.object({
  testUserName: z.string().optional()
});

export const getMyTaskFormResponseSchema = z.object({
  form: formDefinitionSchema.nullable(),
  inputVariableNames: z.array(z.string()),
  outputVariableSchemas: z.record(z.string(), jsonSchema).nullable()
});

export type GetMyTaskFormRequest = z.infer<typeof getMyTaskFormRequestSchema>;
export type GetMyTaskFormResponse = z.infer<typeof getMyTaskFormResponseSchema>;

// submitMyTask

export const submitMyTaskRequestSchema = z.object({
  taskId: z.string(),
  outputValues: z.record(z.string(), z.unknown()),
  testUserName: z.string().optional()
});

export const submitMyTaskResponseSchema = z.object({
  success: z.boolean()
});

export type SubmitMyTaskRequest = z.infer<typeof submitMyTaskRequestSchema>;
export type SubmitMyTaskResponse = z.infer<typeof submitMyTaskResponseSchema>;

// getTaskVariableValue

export const getTaskVariableValueRequestSchema = z.object({
  taskId: z.string(),
  variableName: z.string(),
  testUserName: z.string().optional()
});

export const getTaskVariableValueResponseSchema = z.object({
  value: z.unknown().nullable()
});

export type GetTaskVariableValueRequest = z.infer<typeof getTaskVariableValueRequestSchema>;
export type GetTaskVariableValueResponse = z.infer<typeof getTaskVariableValueResponseSchema>;
