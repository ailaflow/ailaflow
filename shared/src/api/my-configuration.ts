import * as z from 'zod/v4';

// common

export const myChannelDtoSchema = z.object({
  name: z.string(),
  prompt: z.string()
});
export type MyChannelDto = z.infer<typeof myChannelDtoSchema>;

// getMyChannels

export const getMyChannelsResponseSchema = z.object({
  channels: z.array(myChannelDtoSchema)
});
export type GetMyChannelsResponse = z.infer<typeof getMyChannelsResponseSchema>;

// saveMyChannel

export const saveMyChannelRequestSchema = myChannelDtoSchema.extend({
  insert: z.boolean()
});
export const saveMyChannelResponseSchema = z.object({});
export type SaveMyChannelRequest = z.infer<typeof saveMyChannelRequestSchema>;
export type SaveMyChannelResponse = z.infer<typeof saveMyChannelResponseSchema>;

// deleteMyChannel

export const deleteMyChannelResponseSchema = z.object({});
export type DeleteMyChannelResponse = z.infer<typeof deleteMyChannelResponseSchema>;

// changeMyPassword

export const changeMyPasswordRequestSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string()
});

export const changeMyPasswordResponseSchema = z.object({});

export type ChangeMyPasswordRequest = z.infer<typeof changeMyPasswordRequestSchema>;
export type ChangeMyPasswordResponse = z.infer<typeof changeMyPasswordResponseSchema>;
