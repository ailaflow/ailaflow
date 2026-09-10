import * as z from 'zod/v4';

export const healthResponseSchema = z.object({
  server: z.literal('ailaflow'),
  status: z.literal('ok')
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
