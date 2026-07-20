import z from 'zod/v4';

// getMyProcesses

const myProcessLiteDtoSchema = z.object({
  name: z.string(),
  description: z.string(),
  nStartInputs: z.number()
});

export const getMyProcessesResponseSchema = z.object({
  processes: z.array(myProcessLiteDtoSchema)
});

export type MyProcessLiteDto = z.infer<typeof myProcessLiteDtoSchema>;
export type GetMyProcessesResponse = z.infer<typeof getMyProcessesResponseSchema>;
