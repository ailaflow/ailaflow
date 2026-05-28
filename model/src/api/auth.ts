import z from 'zod';

// login

export const loginRequest = z.object({
  userName: z.string(),
  password: z.string()
});
export const loginResponse = z.object({
  authToken: z.string(),
  isAdmin: z.boolean()
});
export type LoginRequest = z.infer<typeof loginRequest>;
export type LoginResponse = z.infer<typeof loginResponse>;

// refreshToken

export const refreshTokenRequest = z.object({
  authToken: z.string().min(1)
});
export const refreshTokenResponse = z.object({
  authToken: z.string().min(1)
});

export type RefreshTokenRequest = z.infer<typeof refreshTokenRequest>;
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponse>;
