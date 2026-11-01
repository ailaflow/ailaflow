import * as z from 'zod/v4';

// install

export const installRequestSchema = z.object({
  rootUserName: z.string(),
  rootPassword: z.string()
});
export const installResponseSchema = z.object({
  error: z.string().optional()
});
export const canInstallResponseSchema = z.object({
  canInstall: z.boolean()
});
export type InstallRequest = z.infer<typeof installRequestSchema>;
export type InstallResponse = z.infer<typeof installResponseSchema>;
export type CanInstallResponse = z.infer<typeof canInstallResponseSchema>;
