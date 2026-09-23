export enum TelegramConfigurationErrorReason {
  INVALID_CONFIGURATION = 1,
  CREDENTIALS_REJECTED = 2,
  CONFIGURATION_NOT_FOUND = 3
}

export class TelegramConfigurationError extends Error {
  public constructor(
    public readonly reason: TelegramConfigurationErrorReason,
    message: string
  ) {
    super(message);
    this.name = TelegramConfigurationError.name;
  }
}
