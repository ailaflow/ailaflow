import * as z from 'zod/v4';
import { paginationRequestSchema, paginationResponseSchema } from './pagination';

const slackIdSchema = z.string().trim().min(1);
const userNameSchema = z.string().trim().min(1);

// common

export enum SlackWelcomeStatus {
  PENDING = 1,
  SENT = 2,
  FAILED = 3
}

export const slackRuntimeHealthSchema = z.object({
  isOperational: z.boolean(),
  isConnected: z.boolean(),
  lastError: z.string().nullable()
});
export type SlackRuntimeHealth = z.infer<typeof slackRuntimeHealthSchema>;

export const slackConfigurationDtoSchema = z.object({
  isConfigured: z.boolean(),
  hasAppToken: z.boolean(),
  hasBotToken: z.boolean(),
  appId: z.string().nullable(),
  workspaceId: z.string().nullable(),
  workspaceName: z.string().nullable(),
  botUserId: z.string().nullable(),
  mappingRevision: z.number().int().nonnegative(),
  configuredAt: z.number().int().nullable(),
  updatedAt: z.number().int().nullable(),
  runtime: slackRuntimeHealthSchema,
  directoryLastRefreshedAt: z.number().int().nullable(),
  counts: z.object({
    active: z.number().int().nonnegative(),
    mapped: z.number().int().nonnegative(),
    unmapped: z.number().int().nonnegative(),
    unavailable: z.number().int().nonnegative(),
    failedWelcome: z.number().int().nonnegative()
  })
});
export type SlackConfigurationDto = z.infer<typeof slackConfigurationDtoSchema>;

// getSlackConfiguration

export const getSlackConfigurationResponseSchema = slackConfigurationDtoSchema;
export type GetSlackConfigurationResponse = z.infer<typeof getSlackConfigurationResponseSchema>;

// saveSlackConfiguration

export const saveSlackConfigurationRequestSchema = z
  .object({
    appToken: z.string().trim().min(1).optional(),
    botToken: z.string().trim().min(1).optional()
  })
  .refine(value => value.appToken !== undefined || value.botToken !== undefined, { message: 'At least one token is required' });
export type SaveSlackConfigurationRequest = z.infer<typeof saveSlackConfigurationRequestSchema>;

export const saveSlackConfigurationResponseSchema = slackConfigurationDtoSchema;
export type SaveSlackConfigurationResponse = z.infer<typeof saveSlackConfigurationResponseSchema>;

// deleteSlackConfiguration

export const deleteSlackConfigurationResponseSchema = z.object({ success: z.literal(true) });
export type DeleteSlackConfigurationResponse = z.infer<typeof deleteSlackConfigurationResponseSchema>;

// getSlackUsers

export const getSlackUsersRequestSchema = paginationRequestSchema.extend({
  search: z.string().trim().max(200).optional()
});
export type GetSlackUsersRequest = z.infer<typeof getSlackUsersRequestSchema>;

export const slackUserDtoSchema = z.object({
  slackUserId: slackIdSchema,
  legacyName: z.string().nullable(),
  displayName: z.string().nullable(),
  realName: z.string().nullable(),
  email: z.string().nullable(),
  isDeleted: z.boolean(),
  userName: z.string().nullable(),
  mappingGeneration: z.number().int().positive().nullable(),
  mappingUpdatedAt: z.number().int().nullable(),
  welcomeStatus: z.enum(SlackWelcomeStatus).nullable(),
  welcomeLastError: z.string().nullable()
});
export type SlackUserDto = z.infer<typeof slackUserDtoSchema>;

export const getSlackUsersResponseSchema = paginationResponseSchema.extend({
  users: z.array(slackUserDtoSchema),
  mappingRevision: z.number().int().nonnegative()
});
export type GetSlackUsersResponse = z.infer<typeof getSlackUsersResponseSchema>;

// refreshSlackUsers

export const refreshSlackUsersResponseSchema = z.object({
  refreshedAt: z.number().int(),
  activeCount: z.number().int().nonnegative(),
  unavailableCount: z.number().int().nonnegative()
});
export type RefreshSlackUsersResponse = z.infer<typeof refreshSlackUsersResponseSchema>;

// saveSlackMappings

export const slackMappingChangeSchema = z.object({
  slackUserId: slackIdSchema,
  userName: userNameSchema.nullable()
});
export type SlackMappingChange = z.infer<typeof slackMappingChangeSchema>;

export const saveSlackMappingsRequestSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    changes: z.array(slackMappingChangeSchema).min(1)
  })
  .superRefine((value, context) => {
    const slackIds = new Set<string>();
    const userNames = new Set<string>();
    for (const change of value.changes) {
      if (slackIds.has(change.slackUserId)) {
        context.addIssue({ code: 'custom', message: 'Slack user IDs must be unique', path: ['changes'] });
      }
      slackIds.add(change.slackUserId);
      if (change.userName !== null) {
        if (userNames.has(change.userName)) {
          context.addIssue({ code: 'custom', message: 'AilaFlow users must be unique', path: ['changes'] });
        }
        userNames.add(change.userName);
      }
    }
  });
export type SaveSlackMappingsRequest = z.infer<typeof saveSlackMappingsRequestSchema>;

export const saveSlackMappingsResponseSchema = z.object({
  mappingRevision: z.number().int().nonnegative()
});
export type SaveSlackMappingsResponse = z.infer<typeof saveSlackMappingsResponseSchema>;
