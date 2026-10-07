import * as z from 'zod/v4';
import { ProcessExecutionTraceEventType, ProcessExecutionTraceStatus, ProcessExecutionTrigger, ProcessLog } from '../process';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// common

const processExecutionTrace = z.object({
  executionId: z.string(),
  processName: z.string(),
  trigger: z.enum(ProcessExecutionTrigger),
  status: z.enum(ProcessExecutionTraceStatus),
  startedBy: z.string(),
  error: z.string().nullable(),
  updatedAt: z.number(),
  completedAt: z.number().nullable()
});

const processExecutionTraceEvent = z.object({
  type: z.enum(ProcessExecutionTraceEventType),
  createdAt: z.number(),
  log: z.custom<ProcessLog>().optional(),
  stepChange: z
    .object({
      stepId: z.string()
    })
    .optional(),
  pause: z
    .object({
      stepId: z.string()
    })
    .optional()
});

export type ProcessExecutionTraceDto = z.infer<typeof processExecutionTrace>;
export type ProcessExecutionTraceEventDto = z.infer<typeof processExecutionTraceEvent>;

// getProcessExecutionTraces

export const getProcessExecutionTracesRequestSchema = paginationRequestSchema.extend({
  processName: z.string().optional()
});

export const getProcessExecutionTracesResponseSchema = paginationResponseSchema.extend({
  traces: z.array(processExecutionTrace)
});

export type GetProcessExecutionTracesRequest = z.infer<typeof getProcessExecutionTracesRequestSchema>;
export type GetProcessExecutionTracesResponse = z.infer<typeof getProcessExecutionTracesResponseSchema>;

// getProcessExecutionTrace

export const getProcessExecutionTraceResponseSchema = z.object({
  trace: processExecutionTrace
});

export type GetProcessExecutionTraceResponse = z.infer<typeof getProcessExecutionTraceResponseSchema>;

// getProcessExecutionTraceEvents

export const getProcessExecutionTraceEventsResponseSchema = z.object({
  events: z.array(processExecutionTraceEvent)
});

export type GetProcessExecutionTraceEventsResponse = z.infer<typeof getProcessExecutionTraceEventsResponseSchema>;

export function strProcessExecutionTrigger(trigger: ProcessExecutionTrigger): string {
  switch (trigger) {
    case ProcessExecutionTrigger.ENDPOINT:
      return 'Endpoint';
    case ProcessExecutionTrigger.TOOL:
      return 'Tool';
    case ProcessExecutionTrigger.SCHEDULED_JOB:
      return 'Scheduled job';
  }
}

export function strProcessExecutionTraceStatus(status: ProcessExecutionTraceStatus): string {
  switch (status) {
    case ProcessExecutionTraceStatus.RUNNING:
      return 'Running';
    case ProcessExecutionTraceStatus.COMPLETED:
      return 'Completed';
    case ProcessExecutionTraceStatus.FAILED:
      return 'Failed';
    case ProcessExecutionTraceStatus.PAUSED:
      return 'Paused';
  }
}
