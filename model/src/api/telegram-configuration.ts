import z from 'zod/v4';

// common

export const telegramBotConfigurationDtoSchema = z.object({
  channelName: z.string(),
  hasBotToken: z.boolean()
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
  botToken: z.string().trim().min(1).optional()
});
export type SaveMyTelegramBotRequest = z.infer<typeof saveMyTelegramBotRequestSchema>;

// deleteMyTelegramBot

export const deleteMyTelegramBotResponseSchema = z.object({
  channelName: z.string()
});
export type DeleteMyTelegramBotResponse = z.infer<typeof deleteMyTelegramBotResponseSchema>;
