import z from 'zod';

// login

export const loginRequest = z.object({
  userName: z.string().min(1),
  password: z.string().min(1)
});
export const loginResponse = z.object({
  success: z.boolean(),
  token: z.string().optional()
});
export type LoginRequest = z.infer<typeof loginRequest>;
export type LoginResponse = z.infer<typeof loginResponse>;

// refreshToken

export const refreshTokenRequest = z.object({
  token: z.string().min(1)
});
export const refreshTokenResponse = z.object({
  token: z.string()
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequest>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponse>;
