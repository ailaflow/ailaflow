// getMyTasks

import z from 'zod/v4';

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
