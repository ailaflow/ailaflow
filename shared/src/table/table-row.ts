import * as z from 'zod/v4';

export const tableRowSchema = z
  .object({
    _id: z.string(),
    _updatedAt: z.number()
  })
  .catchall(z.unknown());

export type TableRow = z.infer<typeof tableRowSchema>;
