import * as z from 'zod/v4';

// login

export const loginRequestSchema = z.object({
  userName: z.string(),
  password: z.string()
});
export const loginResponseSchema = z.object({
  userName: z.string(),
  authToken: z.string(),
  isAdmin: z.boolean()
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// refreshToken

export const refreshTokenRequestSchema = z.object({
  authToken: z.string().min(1)
});
export const refreshTokenResponseSchema = z.object({
  authToken: z.string().min(1)
});
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

// magic link

export const exchangeMagicLinkRequestSchema = z.object({
  token: z.string().min(1)
});
export const exchangeMagicLinkResponseSchema = loginResponseSchema;
export type ExchangeMagicLinkRequest = z.infer<typeof exchangeMagicLinkRequestSchema>;
export type ExchangeMagicLinkResponse = z.infer<typeof exchangeMagicLinkResponseSchema>;
