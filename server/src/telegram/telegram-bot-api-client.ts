export interface TelegramBotIdentity {
  id: number;
  username?: string;
}

export interface TelegramWebhookInfo {
  url: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
  };
}

export class TelegramBotApiError extends Error {
  public constructor(
    message: string,
    public readonly errorCode: number,
    public readonly retryAfterSeconds: number | null
  ) {
    super(message);
    this.name = TelegramBotApiError.name;
  }
}

export class TelegramBotApiClient {
  public getMe(signal: AbortSignal, botToken: string): Promise<TelegramBotIdentity> {
    return this.call(signal, botToken, 'getMe', {});
  }

  public getWebhookInfo(signal: AbortSignal, botToken: string): Promise<TelegramWebhookInfo> {
    return this.call(signal, botToken, 'getWebhookInfo', {});
  }

  public getUpdates(signal: AbortSignal, botToken: string, offset: number | null, timeoutSeconds: number): Promise<TelegramUpdate[]> {
    return this.call(signal, botToken, 'getUpdates', {
      offset: offset ?? undefined,
      timeout: timeoutSeconds,
      allowed_updates: ['message']
    });
  }

  public sendMessage(signal: AbortSignal, botToken: string, chatId: string, text: string): Promise<TelegramMessage> {
    return this.call(signal, botToken, 'sendMessage', { chat_id: chatId, text });
  }

  public async sendTyping(signal: AbortSignal, botToken: string, chatId: string): Promise<void> {
    await this.call(signal, botToken, 'sendChatAction', { chat_id: chatId, action: 'typing' });
  }

  private async call<T>(signal: AbortSignal, botToken: string, method: string, body: object): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });
    let payload: TelegramApiResponse<T>;
    try {
      payload = (await response.json()) as TelegramApiResponse<T>;
    } catch {
      throw new TelegramBotApiError(`Telegram API returned status ${response.status}`, response.status, null);
    }
    if (!response.ok || !payload.ok || payload.result === undefined) {
      throw new TelegramBotApiError(
        payload.description ?? `Telegram API returned status ${response.status}`,
        payload.error_code ?? response.status,
        payload.parameters?.retry_after ?? null
      );
    }
    return payload.result;
  }
}
