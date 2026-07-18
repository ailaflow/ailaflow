import z from 'zod/v4';

// getUsers

const userLiteDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  isAdmin: z.boolean()
});

export const getUsersResponseSchema = z.object({
  users: z.array(userLiteDtoSchema)
});

export type UserLiteDto = z.infer<typeof userLiteDtoSchema>;
export type GetUsersResponse = z.infer<typeof getUsersResponseSchema>;

// createUser

const createUserRequestSchema = z.object({
  name: z.string(),
  password: z.string()
});
const createUserResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;
