import z from 'zod/v4';
import { jsonSchema } from '../process';

// getMyProcesses

const myProcessLiteDtoSchema = z.object({
  name: z.string(),
  description: z.string(),
  startVariablesSchemas: jsonSchema
});

export const getMyProcessesResponseSchema = z.object({
  processes: z.array(myProcessLiteDtoSchema)
});

export type MyProcessLiteDto = z.infer<typeof myProcessLiteDtoSchema>;
export type GetMyProcessesResponse = z.infer<typeof getMyProcessesResponseSchema>;
