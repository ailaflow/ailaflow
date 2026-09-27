import * as z from 'zod/v4';
import { processDefinitionSchema } from './process-definition';

export const exportedProcessSchema = z.object({
  name: z.string(),
  description: z.string(),
  icon: z.string().nullable(),
  definition: processDefinitionSchema,
  hash: z.string()
});

export type ExportedProcess = z.infer<typeof exportedProcessSchema>;
