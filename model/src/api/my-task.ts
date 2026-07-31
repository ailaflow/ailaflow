// getMyTasks

import z from 'zod/v4';
import { formDefinitionSchema, jsonSchema } from '../process';

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
