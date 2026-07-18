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

// getUser

const userDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  isAdmin: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});

export const getUserResponseSchema = z.object({
  user: userDtoSchema
});

export type UserDto = z.infer<typeof userDtoSchema>;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

// updateUser

export const updateUserRequestSchema = z.object({
  id: z.string(),
  name: z.string(),
  password: z.string().optional(),
  isAdmin: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});
const updateUserResponseSchema = z.object({
  id: z.string()
});

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;
