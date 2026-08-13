export class TelegramBotConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TelegramBotConfigurationError.name;
  }
}

export class TelegramBotConfiguration {
  public static create(userName: string, channelName: string, botToken: string): TelegramBotConfiguration {
    if (!userName.trim()) {
      throw new TelegramBotConfigurationError('User name is required');
    }
    if (!channelName.trim()) {
      throw new TelegramBotConfigurationError('Channel name is required');
    }
    if (!botToken.trim()) {
      throw new TelegramBotConfigurationError('Bot token is required');
    }
    return new TelegramBotConfiguration(userName, channelName, botToken);
  }

  public constructor(
    public readonly userName: string,
    public readonly channelName: string,
    public readonly botToken: string
  ) {}
}
