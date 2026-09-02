import * as z from 'zod/v4';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

// getMyNotifications

export const getMyNotificationsRequestSchema = paginationRequestSchema;

const myNotificationDtoSchema = z.object({
  id: z.string(),
  message: z.string(),
  createdAt: z.number()
});

export const getMyNotificationsResponseSchema = paginationResponseSchema.extend({
  notifications: z.array(myNotificationDtoSchema)
});

export type GetMyNotificationsRequest = z.infer<typeof getMyNotificationsRequestSchema>;
export type MyNotificationDto = z.infer<typeof myNotificationDtoSchema>;
export type GetMyNotificationsResponse = z.infer<typeof getMyNotificationsResponseSchema>;

// deleteMyNotification

export const deleteMyNotificationResponseSchema = z.object({
  id: z.string()
});

export type DeleteMyNotificationResponse = z.infer<typeof deleteMyNotificationResponseSchema>;
