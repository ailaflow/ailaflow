import * as z from 'zod/v4';

export const taskCompletionPolicySchema = z.enum({
  ALL_ASSIGNEES: 'all_assignees',
  ANY_ASSIGNEE: 'any_assignee'
} as const);

export const TaskCompletionPolicy = taskCompletionPolicySchema.enum;
export type TaskCompletionPolicy = z.infer<typeof taskCompletionPolicySchema>;
