import * as z from 'zod/v4';

// changeMyPassword

export const changeMyPasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
});

export const changeMyPasswordResponseSchema = z.object({});

export type ChangeMyPasswordRequest = z.infer<typeof changeMyPasswordRequestSchema>;
export type ChangeMyPasswordResponse = z.infer<typeof changeMyPasswordResponseSchema>;
