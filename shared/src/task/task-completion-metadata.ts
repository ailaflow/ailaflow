import * as z from 'zod/v4';

export const taskCompletionMetadataSchema = z.object({
  status: z.enum(['completed', 'deadline_occurred']),
  items: z.array(
    z.object({
      time: z.number(),
      userName: z.string()
    })
  )
});

export type TaskCompletionMetadata = z.infer<typeof taskCompletionMetadataSchema>;
