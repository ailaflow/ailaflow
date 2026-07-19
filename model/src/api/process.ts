import z from 'zod/v4';
import { processDefinitionSchema } from '../process';

// getProcesses

const processLiteDtoSchema = z.object({
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

// saveProcess

export const saveProcessRequestSchema = z.object({
  insert: z.boolean(),
  name: z.string(),
  description: z.string(),
  userAccessExpression: z.string(),
  definition: processDefinitionSchema,
  hash: z.string()
});
export const saveProcessResponseSchema = z.object({
  name: z.string()
});

export type SaveProcessRequest = z.infer<typeof saveProcessRequestSchema>;
export type SaveProcessResponse = z.infer<typeof saveProcessResponseSchema>;

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
