import { SlackError, SlackErrorReason } from '../../slack/slack-error';
import { EndpointError } from '../framework/endpoint-error';

export async function mapSlackEndpointErrors<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!(error instanceof SlackError)) {
      throw error;
    }
    switch (error.reason) {
      case SlackErrorReason.MAPPING_REVISION_CONFLICT:
      case SlackErrorReason.DIRECTORY_REFRESH_IN_PROGRESS: {
        throw new EndpointError(error.message, 409);
      }
      case SlackErrorReason.API_UNAVAILABLE: {
        throw new EndpointError(error.message, 503);
      }
      default: {
        throw new EndpointError(error.message, 400);
      }
    }
  }
}
