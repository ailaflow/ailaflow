import z from 'zod/v4';
import { processDefinitionSchema } from '../process';

// getProcesses

const processLiteDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  nStartInputs: z.number()
});

export const getProcessesResponseSchema = z.object({
  processes: z.array(processLiteDtoSchema)
});

export type ProcessLiteDto = z.infer<typeof processLiteDtoSchema>;
export type GetProcessesResponse = z.infer<typeof getProcessesResponseSchema>;

// getProcess

const processDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  definition: processDefinitionSchema
});

export const getProcessResponseSchema = z.object({
  process: processDtoSchema
});

export type ProcessDto = z.infer<typeof processDtoSchema>;
export type GetProcessResponse = z.infer<typeof getProcessResponseSchema>;

// updateProcess

export const updateProcessRequestSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  definition: processDefinitionSchema,
  hash: z.string()
});
export const updateProcessResponseSchema = z.object({
  id: z.string()
});

export type UpdateProcessRequest = z.infer<typeof updateProcessRequestSchema>;
export type UpdateProcessResponse = z.infer<typeof updateProcessResponseSchema>;

// testProcess

export const testProcessRequestSchema = z.object({
  input: z.record(z.string(), z.any())
});

export type TestProcessRequest = z.infer<typeof testProcessRequestSchema>;

export interface TestProcessUpdate {
  log?: {
    level: string;
    message: string;
  };
}
