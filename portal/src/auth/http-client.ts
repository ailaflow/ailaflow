export interface HttpClientRequest {
  method: string;
  path: string;
  body?: object;
  authToken?: string;
}

export class HttpClientError extends Error {
  public static is(obj: unknown): obj is HttpClientError {
    return (obj as Error).name === 'HttpClientError';
  }

  public constructor(
    message: string,
    public readonly statusCode: number,
    public readonly data: object | null
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export class HttpClient {
  public onUnauthorizedListener: (() => void) | null = null;

  public constructor(private readonly baseUrl: string) {}

  public setOnUnauthorizedListener(listener: (() => void) | null) {
    this.onUnauthorizedListener = listener;
  }

  public async json<T>(request: HttpClientRequest): Promise<T> {
    const headers: Record<string, string> = {};
    if (request.body) {
      headers['Content-Type'] = 'application/json';
    }
    if (request.authToken) {
      headers['Authorization'] = `Bearer ${request.authToken}`;
    }

    const url = new URL(request.path, this.baseUrl);
    const response = await fetch(url, {
      headers,
      keepalive: true,
      method: request.method,
      body: request.body ? JSON.stringify(request.body) : undefined
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
            message = json['error'];
          }
        }
      } catch (e) {}

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
      throw new HttpClientError('Unknown error', status, data);
    }

    return await response.json();
  }
}
