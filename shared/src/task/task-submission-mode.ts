import * as z from 'zod/v4';

export enum TaskSubmissionMode {
  AI_TOOL_OR_TASK_FORM = 'ai_tool_or_task_form',
  TASK_FORM = 'task_form'
}

export const taskSubmissionModeSchema = z.enum(TaskSubmissionMode);
