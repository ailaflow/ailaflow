import z from 'zod/v4';
import { formDefinitionSchema, jsonSchema } from '../process';

// getMyProcesses

const myProcessLiteDtoSchema = z.object({
  name: z.string(),
  description: z.string(),
  startVariableSchemas: jsonSchema
});

export const getMyProcessesResponseSchema = z.object({
  processes: z.array(myProcessLiteDtoSchema)
});

export type MyProcessLiteDto = z.infer<typeof myProcessLiteDtoSchema>;
export type GetMyProcessesResponse = z.infer<typeof getMyProcessesResponseSchema>;

// getMyProcessStartForm

export const getMyProcessStartFormResponseSchema = z.object({
  form: formDefinitionSchema,
  startVariableSchemas: jsonSchema.nullable()
});

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
