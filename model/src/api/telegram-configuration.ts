import z from 'zod/v4';

// common

export const telegramBotConfigurationDtoSchema = z.object({
  channelName: z.string(),
  hasBotToken: z.boolean(),
  botUserName: z.string().nullable(),
  isConnected: z.boolean(),
  linkCode: z.string().nullable()
});
export type TelegramBotConfigurationDto = z.infer<typeof telegramBotConfigurationDtoSchema>;

// getMyTelegramConfiguration

export const getMyTelegramConfigurationResponseSchema = z.object({
  bots: z.array(telegramBotConfigurationDtoSchema)
});
export type GetMyTelegramConfigurationResponse = z.infer<typeof getMyTelegramConfigurationResponseSchema>;

// saveMyTelegramBot

export const saveMyTelegramBotRequestSchema = z.object({
  channelName: z.string().trim().min(1),
  botToken: z.string().trim().min(1).optional(),
  reconnect: z.boolean().optional()
});
export type SaveMyTelegramBotRequest = z.infer<typeof saveMyTelegramBotRequestSchema>;

export const saveMyTelegramBotResponseSchema = z.object({
  bot: telegramBotConfigurationDtoSchema
});
export type SaveMyTelegramBotResponse = z.infer<typeof saveMyTelegramBotResponseSchema>;

// deleteMyTelegramBot

export const deleteMyTelegramBotResponseSchema = z.object({
  channelName: z.string()
});
export type DeleteMyTelegramBotResponse = z.infer<typeof deleteMyTelegramBotResponseSchema>;
