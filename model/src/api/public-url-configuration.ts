import z from 'zod/v4';
import { PublicUrlValidator } from '../configuration/public-url';

// common

const publicUrlSchema = z.string().refine(value => PublicUrlValidator.validate(value) === null, {
  error: 'Invalid Public URL'
});

// getPublicUrlConfiguration

export const getPublicUrlConfigurationResponseSchema = z.object({
  publicUrl: publicUrlSchema.nullable()
});
export type GetPublicUrlConfigurationResponse = z.infer<typeof getPublicUrlConfigurationResponseSchema>;

// savePublicUrlConfiguration

export const savePublicUrlConfigurationRequestSchema = z.object({
  publicUrl: publicUrlSchema.nullable()
});
export type SavePublicUrlConfigurationRequest = z.infer<typeof savePublicUrlConfigurationRequestSchema>;

export const savePublicUrlConfigurationResponseSchema = getPublicUrlConfigurationResponseSchema;
export type SavePublicUrlConfigurationResponse = z.infer<typeof savePublicUrlConfigurationResponseSchema>;

// testPublicUrl

export const testPublicUrlRequestSchema = z.object({
  publicUrl: publicUrlSchema.nullish()
});
export type TestPublicUrlRequest = z.infer<typeof testPublicUrlRequestSchema>;

export const testPublicUrlResponseSchema = z.object({
  publicUrl: publicUrlSchema.nullable(),
  isAvailable: z.boolean(),
  error: z.string().nullable()
});
export type TestPublicUrlResponse = z.infer<typeof testPublicUrlResponseSchema>;
