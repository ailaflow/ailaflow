import * as z from 'zod/v4';

// common

export const telegramBotConfigurationDtoSchema = z.object({
  channelName: z.string(),
  hasBotToken: z.boolean(),
  botUserName: z.string().nullable(),
  isConnected: z.boolean(),
  linkCode: z.string().nullable()
});
export type TelegramBotConfigurationDto = z.infer<typeof telegramBotConfigurationDtoSchema>;

// getTelegramConfiguration

export const getTelegramConfigurationResponseSchema = z.object({
  bots: z.array(telegramBotConfigurationDtoSchema)
});
export type GetTelegramConfigurationResponse = z.infer<typeof getTelegramConfigurationResponseSchema>;

// saveTelegramBot

export const saveTelegramBotRequestSchema = z.object({
  channelName: z.string().trim().min(1),
  botToken: z.string().trim().min(1).optional(),
  reconnect: z.boolean().optional()
});
export type SaveTelegramBotRequest = z.infer<typeof saveTelegramBotRequestSchema>;

export const saveTelegramBotResponseSchema = z.object({
  bot: telegramBotConfigurationDtoSchema
});
export type SaveTelegramBotResponse = z.infer<typeof saveTelegramBotResponseSchema>;

// deleteTelegramBot

export const deleteTelegramBotResponseSchema = z.object({
  channelName: z.string()
});
export type DeleteTelegramBotResponse = z.infer<typeof deleteTelegramBotResponseSchema>;
