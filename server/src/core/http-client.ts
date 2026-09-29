export interface HttpSseHandler<Update extends object> {
  onData: (data: Update) => void;
  onClose: (error?: Error) => void;
}

export class HttpClientError extends Error {
  public constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export class HttpClient {
  public constructor(private readonly baseUrl: URL) {}

  public async json<T>(signal: AbortSignal, method: string, path: string, body?: object, headers?: Record<string, string>): Promise<T> {
    const response = await this.request(signal, method, path, body, headers);
    return (await response.json()) as T;
  }

  public async blob(signal: AbortSignal, method: string, path: string, body?: object, headers?: Record<string, string>): Promise<Blob> {
    const response = await this.request(signal, method, path, body, headers);
    return await response.blob();
  }

  public async sse<Update extends object>(
    signal: AbortSignal,
    method: string,
    path: string,
    body: object | undefined,
    headers: Record<string, string> | undefined,
    handler: HttpSseHandler<Update>
  ): Promise<void> {
    const response = await this.request(signal, method, path, body, headers);
    const reader = response.body?.getReader();
    if (!reader) {
      throw new HttpClientError('Response body is not readable', -1);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        // console.log(`🔷 ${chunk}`);
        buffer += chunk;
        for (;;) {
          const pos = buffer.indexOf('\n');
          if (pos === -1) {
            break;
          }
          const line = buffer.slice(0, pos);
          buffer = buffer.slice(pos + 1);
          if (line.length > 0 && line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            handler.onData(data);
          }
        }
      }
      handler.onClose();
    } catch (e) {
      handler.onClose(e as Error);
      try {
        await reader.cancel();
      } catch {}
    }
  }

  public async request(
    signal: AbortSignal,
    method: string,
    path: string,
    body?: object,
    headers?: Record<string, string>
  ): Promise<Response> {
    let response: Response;
    try {
      const init: RequestInit = {
        method,
        keepalive: true,
        signal
      };
      if (body) {
        init.headers = {
          'Content-Type': 'application/json'
        };
        init.body = JSON.stringify(body);
      }
      if (headers) {
        if (init.headers) {
          Object.assign(init.headers, headers);
        } else {
          init.headers = headers;
        }
      }
      const url = new URL(path, this.baseUrl);
      // console.log(`🔶 ${method} ${url}`);
      response = await fetch(url, init);
    } catch (e) {
      throw new HttpClientError(`Request ${method} ${path} failed: ${(e as Error)?.message ?? e}`, -1);
    }
    if (!response.ok) {
      let error = '<unknown>';
      try {
        error = await response.text();
      } catch (e) {}

      throw new HttpClientError(`Request ${method} ${path} returned status ${response.status}: ${error}`, response.status);
    }
    return response;
  }
}
