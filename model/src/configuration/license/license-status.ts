import * as z from 'zod/v4';
import { LicenseType } from './license-type';

export const licenseStatusSchema = z.object({
  type: z.enum(LicenseType),
  isValid: z.boolean(),
  proof: z.string().nullable(),
  checkedAt: z.number().int().nonnegative()
});

export type LicenseStatus = z.infer<typeof licenseStatusSchema>;
