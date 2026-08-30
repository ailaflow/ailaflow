import z from 'zod/v4';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getTasks

const taskLiteDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdBy: z.string(),
  executionId: z.string(),
  isTest: z.boolean(),
  completedAt: z.number().optional(),
  isOutdated: z.boolean().optional(),
  assignedCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  createdAt: z.number()
});

export const getTasksRequestSchema = paginationRequestSchema.extend({
  onlyOpen: z.coerce.number().int().min(0).max(1).transform(Boolean).default(true)
});

export const getTasksResponseSchema = paginationResponseSchema.extend({
  tasks: z.array(taskLiteDtoSchema)
});

export type TaskLiteDto = z.infer<typeof taskLiteDtoSchema>;
export type GetTasksRequest = z.infer<typeof getTasksRequestSchema>;
export type GetTasksResponse = z.infer<typeof getTasksResponseSchema>;

// deleteTask

export const deleteTaskResponseSchema = z.object({
  id: z.string()
});

export type DeleteTaskResponse = z.infer<typeof deleteTaskResponseSchema>;
