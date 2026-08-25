import z from 'zod/v4';
import { formDefinitionSchema, jsonSchema } from '../process';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getMyProcesses

const myProcessLiteDtoSchema = z.object({
  name: z.string(),
  description: z.string(),
  startVariableSchemas: jsonSchema
});

export const getMyProcessesRequestSchema = paginationRequestSchema;

export const getMyProcessesResponseSchema = paginationResponseSchema.extend({
  processes: z.array(myProcessLiteDtoSchema)
});

export type MyProcessLiteDto = z.infer<typeof myProcessLiteDtoSchema>;
export type GetMyProcessesRequest = z.infer<typeof getMyProcessesRequestSchema>;
export type GetMyProcessesResponse = z.infer<typeof getMyProcessesResponseSchema>;

// getMyProcessStartForm

export const getMyProcessStartFormRequestSchema = z.object({
  testUserName: z.string().optional()
});

export const getMyProcessStartFormResponseSchema = z.object({
  form: formDefinitionSchema.nullable(),
  startVariableSchemas: jsonSchema.nullable()
});

export type GetMyProcessStartFormRequest = z.infer<typeof getMyProcessStartFormRequestSchema>;
export type GetMyProcessStartFormResponse = z.infer<typeof getMyProcessStartFormResponseSchema>;

// startMyProcess

export const startMyProcessRequestSchema = z.object({
  startValues: z.record(z.string(), z.any()),
  chatSession: z.object({
    token: z.string(),
    messageId: z.number(),
    completedMessageIndex: z.number()
  })
});

export const startMyProcessResponseSchema = z.object({
  executionId: z.string()
});

export type StartMyProcessRequest = z.infer<typeof startMyProcessRequestSchema>;
export type StartMyProcessResponse = z.infer<typeof startMyProcessResponseSchema>;
