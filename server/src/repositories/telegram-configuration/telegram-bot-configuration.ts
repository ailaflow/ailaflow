export class TelegramBotConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TelegramBotConfigurationError.name;
  }
}

export class TelegramBotConfiguration {
  public static create(
    userName: string,
    channelName: string,
    botToken: string,
    options: {
      botId?: string | null;
      botUserName?: string | null;
      telegramChatId?: string | null;
      linkCode?: string | null;
      lastUpdateId?: number | null;
    } = {}
  ): TelegramBotConfiguration {
    if (!userName.trim()) {
      throw new TelegramBotConfigurationError('User name is required');
    }
    if (!channelName.trim()) {
      throw new TelegramBotConfigurationError('Channel name is required');
    }
    if (!botToken.trim()) {
      throw new TelegramBotConfigurationError('Bot token is required');
    }
    return new TelegramBotConfiguration(
      userName,
      channelName,
      botToken,
      options.botId ?? null,
      options.botUserName ?? null,
      options.telegramChatId ?? null,
      options.linkCode ?? null,
      options.lastUpdateId ?? null
    );
  }

  public constructor(
    public readonly userName: string,
    public readonly channelName: string,
    public readonly botToken: string,
    public readonly botId: string | null = null,
    public readonly botUserName: string | null = null,
    public readonly telegramChatId: string | null = null,
    public readonly linkCode: string | null = null,
    public readonly lastUpdateId: number | null = null
  ) {}
}
