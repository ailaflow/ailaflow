import * as z from 'zod/v4';
import { LicenseType } from '../configuration/license';

// getLicenseStatus

export const getLicenseStatusResponseSchema = z.object({
  instanceId: z.string(),
  version: z.string(),
  type: z.enum(LicenseType).optional(),
  validationError: z.string().nullable().optional(),
  checkedAt: z.number().optional(),
  canUpgrade: z.boolean().optional()
});

export type GetLicenseStatusResponse = z.infer<typeof getLicenseStatusResponseSchema>;

// getLicenseConfiguration

export const getLicenseConfigurationResponseSchema = z.object({
  type: z.enum(LicenseType),
  hasLicenseKey: z.boolean()
});

export type GetLicenseConfigurationResponse = z.infer<typeof getLicenseConfigurationResponseSchema>;

// saveLicenseConfiguration

export const saveLicenseConfigurationRequestSchema = z.object({
  type: z.enum(LicenseType),
  licenseKey: z.string().nullable()
});

export type SaveLicenseConfigurationRequest = z.infer<typeof saveLicenseConfigurationRequestSchema>;
