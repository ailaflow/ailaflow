import * as z from 'zod/v4';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getUsers

const userLiteDtoSchema = z.object({
  name: z.string(),
  isActive: z.boolean(),
  isAdmin: z.boolean()
});

export const getUsersRequestSchema = paginationRequestSchema.extend({
  search: z.string().optional(),
  onlyActive: z.coerce.number().int().min(0).max(1).transform(Boolean).default(false)
});

export const getUsersResponseSchema = paginationResponseSchema.extend({
  users: z.array(userLiteDtoSchema)
});

export type UserLiteDto = z.infer<typeof userLiteDtoSchema>;
export type GetUsersRequest = z.infer<typeof getUsersRequestSchema>;
export type GetUsersResponse = z.infer<typeof getUsersResponseSchema>;

// getUser

const userDtoSchema = z.object({
  name: z.string(),
  isActive: z.boolean(),
  isAdmin: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});

export const getUserResponseSchema = z.object({
  user: userDtoSchema
});

export type UserDto = z.infer<typeof userDtoSchema>;
export type GetUserResponse = z.infer<typeof getUserResponseSchema>;

// saveUser

export const saveUserRequestSchema = z.object({
  insert: z.boolean(),
  name: z.string(),
  password: z.string().optional(),
  isActive: z.boolean(),
  isAdmin: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});
const saveUserResponseSchema = z.object({
  name: z.string()
});

export type SaveUserRequest = z.infer<typeof saveUserRequestSchema>;
export type SaveUserResponse = z.infer<typeof saveUserResponseSchema>;
