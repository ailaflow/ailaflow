import * as z from 'zod/v4';

// common

export enum SlackConnectionStatus {
  CONNECTED = 1,
  UNAVAILABLE = 2,
  NOT_CONNECTED = 3
}

// getMySlackConfiguration

export const mySlackConfigurationResponseSchema = z.object({
  status: z.enum(SlackConnectionStatus),
  workspaceName: z.string().nullable(),
  displayName: z.string().nullable(),
  email: z.string().nullable()
});
export type MySlackConfigurationResponse = z.infer<typeof mySlackConfigurationResponseSchema>;
