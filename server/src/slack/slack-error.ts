const SLACK_TOKEN_PATTERN = /x(?:app|oxb)-[A-Za-z0-9-]+/g;

export enum SlackErrorReason {
  NOT_CONFIGURED = 1,
  INVALID_CONFIGURATION = 2,
  CREDENTIALS_REJECTED = 3,
  API_UNAVAILABLE = 4,
  MAPPING_REVISION_CONFLICT = 5,
  INVALID_MAPPING = 6,
  DIRECTORY_REFRESH_IN_PROGRESS = 7
}

export class SlackError extends Error {
  public constructor(
    public readonly reason: SlackErrorReason,
    message: string
  ) {
    super(message);
    this.name = SlackError.name;
  }
}

export function formatSlackError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(SLACK_TOKEN_PATTERN, '[redacted Slack token]');
}
