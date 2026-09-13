import * as z from 'zod/v4';

export const taskFinalizationPolicySchema = z.enum({
  ALL_ASSIGNEES: 'all_assignees',
  ANY_ASSIGNEE: 'any_assignee'
} as const);

export const TaskFinalizationPolicy = taskFinalizationPolicySchema.enum;
export type TaskFinalizationPolicy = z.infer<typeof taskFinalizationPolicySchema>;
