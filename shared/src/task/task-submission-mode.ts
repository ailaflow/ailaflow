import * as z from 'zod/v4';

export enum TaskSubmissionMode {
  AI_TOOL_OR_TASK_FORM = 0,
  TASK_FORM = 1
}

export const taskSubmissionModeSchema = z.enum(TaskSubmissionMode);
