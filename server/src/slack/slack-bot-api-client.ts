import type { SlackMessagePayload } from './slack-message-payload';

export interface SlackAuthIdentity {
  appId: string | null;
  workspaceId: string;
  workspaceName: string;
  botUserId: string;
}

export interface SlackSocketConnection {
  url: string;
}

export interface SlackApiUser {
  id: string;
  name?: string;
  real_name?: string;
  deleted?: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  profile?: {
    display_name?: string;
    real_name?: string;
    email?: string;
  };
}

export interface SlackPostedMessage {
  channel: string;
  ts: string;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
  [key: string]: unknown;
}

export class SlackBotApiError extends Error {
  public constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly retryAfterSeconds: number | null
  ) {
    super(`Slack API request failed (${code})`);
    this.name = SlackBotApiError.name;
  }
}

export class SlackBotApiClient {
  public constructor(private readonly apiBaseUrl = 'https://slack.com/api') {}

  public async testAuth(signal: AbortSignal, botToken: string): Promise<SlackAuthIdentity> {
    const payload = await this.call(signal, botToken, 'auth.test', {});
    const workspaceId = readString(payload, 'team_id');
    const workspaceName = readString(payload, 'team');
    const botUserId = readString(payload, 'user_id');
    const appId = readOptionalString(payload, 'app_id');
    return { appId, workspaceId, workspaceName, botUserId };
  }

  public async openSocketConnection(signal: AbortSignal, appToken: string): Promise<SlackSocketConnection> {
    const payload = await this.call(signal, appToken, 'apps.connections.open', {});
    return { url: readString(payload, 'url') };
  }

  public async listUsers(signal: AbortSignal, botToken: string): Promise<SlackApiUser[]> {
    const users: SlackApiUser[] = [];
    let cursor: string | undefined;
    do {
      const payload = await this.call(signal, botToken, 'users.list', { limit: 200, cursor });
      const members = payload['members'];
      if (!Array.isArray(members)) {
        throw new SlackBotApiError('invalid_response', 200, null);
      }
      users.push(...(members as SlackApiUser[]));
      const metadata = payload.response_metadata;
      cursor = metadata?.next_cursor?.trim() || undefined;
    } while (cursor);
    return users;
  }

  public async postMessage(
    signal: AbortSignal,
    botToken: string,
    channel: string,
    message: SlackMessagePayload
  ): Promise<SlackPostedMessage> {
    const payload = await this.call(signal, botToken, 'chat.postMessage', {
      channel,
      text: message.text,
      blocks: message.blocks,
      mrkdwn: false,
      unfurl_links: false,
      unfurl_media: false
    });
    return { channel: readString(payload, 'channel'), ts: readString(payload, 'ts') };
  }

  private async call(signal: AbortSignal, token: string, method: string, body: Record<string, unknown>): Promise<SlackApiResponse> {
    const response = await fetch(`${this.apiBaseUrl}/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(body),
      signal
    });
    const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
    let payload: SlackApiResponse;
    try {
      payload = (await response.json()) as SlackApiResponse;
    } catch {
      throw new SlackBotApiError(response.status === 429 ? 'rate_limited' : 'invalid_response', response.status, retryAfter);
    }
    if (!response.ok || !payload.ok) {
      throw new SlackBotApiError(payload.error ?? `http_${response.status}`, response.status, retryAfter);
    }
    return payload;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function readString(value: Record<string, unknown>, key: string): string {
  const result = readOptionalString(value, key);
  if (!result) {
    throw new SlackBotApiError('invalid_response', 200, null);
  }
  return result;
}

function readOptionalString(value: Record<string, unknown>, key: string): string | null {
  const result = value[key];
  return typeof result === 'string' && result ? result : null;
}
