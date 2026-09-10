import * as z from 'zod/v4';
import { LicenseType } from '../configuration';

// install

export const installRequestSchema = z.object({
  rootUserName: z.string(),
  rootPassword: z.string(),
  licenseType: z.enum(LicenseType),
  licenseKey: z.string().nullable()
});
export const installResponseSchema = z.object({
  error: z.string().optional()
});
export type InstallRequest = z.infer<typeof installRequestSchema>;
export type InstallResponse = z.infer<typeof installResponseSchema>;
