export class HttpClientError extends Error {
  public constructor(
    message: string,
    public readonly statusCode: number,
    public readonly data: object | null
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export interface HttpClientSseListener<U> {
  onMessage(data: U): void;
  onClose(error?: Error): void;
}

export class HttpClient {
  private onUnauthorizedListener: (() => void) | null = null;

  public constructor(private headers: Record<string, string> = {}) {}

  public setOnUnauthorizedListener(listener: (() => void) | null) {
    this.onUnauthorizedListener = listener;
  }

  public updateHeaders(headers: Record<string, string>) {
    this.headers = headers;
  }

  private async fetch(abortSignal: AbortSignal, method: string, path: string, body?: object): Promise<Response> {
    const headers: Record<string, string> = { ...this.headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(path, {
      headers,
      method,
      body: body ? JSON.stringify(body) : undefined,
      signal: abortSignal,
      cache: 'no-store'
    });

    const status = response.status;
    if (status < 200 || status >= 300) {
      let data: object | null = null;
      let message: string | null = null;
      try {
        const json = await response.json();
        if (typeof json === 'object') {
          data = json;
          if (json['error']) {
            message = String(json['error']);
          }
        }
      } catch {}

      if (status === 401) {
        this.onUnauthorizedListener?.();
      }
      if (message) {
        throw new HttpClientError(message, status, data);
      }
      if (status === 404) {
        throw new HttpClientError('Resource not found', status, data);
      }
      if (status === 500) {
        throw new HttpClientError('Internal server error', status, data);
      }
      throw new HttpClientError(`Request failed with status ${status}`, status, data);
    }
    return response;
  }

  public async json<T>(abortSignal: AbortSignal, method: string, path: string, body?: object): Promise<T> {
    const response = await this.fetch(abortSignal, method, path, body);
    return await response.json();
  }

  public async sse<U>(
    abortSignal: AbortSignal,
    listener: HttpClientSseListener<U>,
    method: string,
    path: string,
    body?: object
  ): Promise<void> {
    const response = await this.fetch(abortSignal, method, path, body);
    const reader = response.body?.getReader();
    if (!reader) {
      throw new HttpClientError('Response body is null', response.status, null);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        for (;;) {
          const pos = buffer.indexOf('\n');
          if (pos === -1) {
            break;
          }
          const line = buffer.slice(0, pos).trimEnd();
          buffer = buffer.slice(pos + 1);
          if (line.length > 0 && line.startsWith('data: ')) {
            listener.onMessage(JSON.parse(line.slice(6)) as U);
          }
        }
      }
      listener.onClose();
    } catch (e) {
      listener.onClose(e as Error);
      try {
        await reader.cancel();
      } catch {}
    }
  }
}
