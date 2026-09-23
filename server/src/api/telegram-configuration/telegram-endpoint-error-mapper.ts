import { TelegramConfigurationError, TelegramConfigurationErrorReason } from '../../telegram/telegram-configuration-error';
import { EndpointError } from '../framework/endpoint-error';

export async function mapTelegramEndpointErrors<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof TelegramConfigurationError)) {
      throw error;
    }
    switch (error.reason) {
      case TelegramConfigurationErrorReason.CONFIGURATION_NOT_FOUND: {
        throw new EndpointError(error.message, 404);
      }
      default: {
        throw new EndpointError(error.message, 400);
      }
    }
  }
}
