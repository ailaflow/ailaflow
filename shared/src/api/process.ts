import * as z from 'zod/v4';
import {
  exportedProcessSchema,
  processDefinitionSchema,
  ProcessDisplay,
  ProcessExecutionMode,
  ProcessExecutionOutcome,
  ProcessLog
} from '../process';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getProcesses

const processLiteDtoSchema = z.object({
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  display: z.enum(ProcessDisplay),
  executionMode: z.enum(ProcessExecutionMode),
  icon: z.string().nullable(),
  nTasksSteps: z.number(),
  nReturnSteps: z.number(),
  sandboxNames: z.array(z.string()),
  definitionSize: z.number()
});

export const getProcessesRequestSchema = paginationRequestSchema.extend({
  search: z.string().optional()
});

export const getProcessesResponseSchema = paginationResponseSchema.extend({
  processes: z.array(processLiteDtoSchema)
});

export type ProcessLiteDto = z.infer<typeof processLiteDtoSchema>;
export type GetProcessesRequest = z.infer<typeof getProcessesRequestSchema>;
export type GetProcessesResponse = z.infer<typeof getProcessesResponseSchema>;

// getProcess

const processDtoSchema = z.object({
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  display: z.enum(ProcessDisplay),
  executionMode: z.enum(ProcessExecutionMode),
  icon: z.string().nullable(),
  definition: processDefinitionSchema
});

export const getProcessResponseSchema = z.object({
  process: processDtoSchema
});

export type ProcessDto = z.infer<typeof processDtoSchema>;
export type GetProcessResponse = z.infer<typeof getProcessResponseSchema>;

// saveProcess

export const saveProcessRequestSchema = z.object({
  insert: z.boolean(),
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  display: z.enum(ProcessDisplay),
  executionMode: z.enum(ProcessExecutionMode),
  icon: z.string().nullable(),
  definition: processDefinitionSchema,
  hash: z.string()
});
export const saveProcessResponseSchema = z.object({
  name: z.string()
});

export type SaveProcessRequest = z.infer<typeof saveProcessRequestSchema>;
export type SaveProcessResponse = z.infer<typeof saveProcessResponseSchema>;

// deleteProcess

export const deleteProcessResponseSchema = z.object({
  name: z.string()
});

export type DeleteProcessResponse = z.infer<typeof deleteProcessResponseSchema>;

// exportProcess

export const exportProcessResponseSchema = z.object({
  exportedProcess: exportedProcessSchema
});

export type ExportProcessResponse = z.infer<typeof exportProcessResponseSchema>;

// testProcess

export const testProcessRequestSchema = z.object({
  input: z.record(z.string(), z.any())
});

export type TestProcessRequest = z.infer<typeof testProcessRequestSchema>;

export interface TestProcessUpdate {
  log?: ProcessLog;
  outcome?: ProcessExecutionOutcome;
  currentStepId?: string;
}
