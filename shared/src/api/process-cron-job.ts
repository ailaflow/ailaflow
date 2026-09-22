import * as z from 'zod/v4';

// common

export enum ProcessCronJobRunStatus {
  RUNNING = 1,
  SUCCEEDED = 2,
  FAILED = 3
}

const processCronJobRunStatusSchema = z.union([
  z.literal(ProcessCronJobRunStatus.RUNNING),
  z.literal(ProcessCronJobRunStatus.SUCCEEDED),
  z.literal(ProcessCronJobRunStatus.FAILED)
]);

export const processCronJobRunSchema = z.object({
  executionId: z.string().nullable(),
  status: processCronJobRunStatusSchema,
  startedAt: z.number(),
  finishedAt: z.number().nullable(),
  error: z.string().nullable()
});

export type ProcessCronJobRun = z.infer<typeof processCronJobRunSchema>;

export const processCronJobDtoSchema = z.object({
  id: z.string(),
  processName: z.string(),
  starterUserName: z.string(),
  expression: z.string(),
  timeZone: z.string(),
  inputValues: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean(),
  nextExecutionAt: z.number(),
  lastRun: processCronJobRunSchema.nullable()
});

export type ProcessCronJobDto = z.infer<typeof processCronJobDtoSchema>;

// getProcessCronJobs

export const getProcessCronJobsResponseSchema = z.object({
  jobs: z.array(processCronJobDtoSchema)
});

export type GetProcessCronJobsResponse = z.infer<typeof getProcessCronJobsResponseSchema>;

// saveProcessCronJob

export const saveProcessCronJobRequestSchema = z.object({
  insert: z.boolean(),
  id: z.string().optional(),
  processName: z.string(),
  starterUserName: z.string().min(1),
  expression: z.string(),
  timeZone: z.string(),
  inputValues: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean()
});

export const saveProcessCronJobResponseSchema = z.object({
  id: z.string()
});

export type SaveProcessCronJobRequest = z.infer<typeof saveProcessCronJobRequestSchema>;
export type SaveProcessCronJobResponse = z.infer<typeof saveProcessCronJobResponseSchema>;

// deleteProcessCronJob

export const deleteProcessCronJobResponseSchema = z.object({
  id: z.string()
});

export type DeleteProcessCronJobResponse = z.infer<typeof deleteProcessCronJobResponseSchema>;
