import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

const MAX_BODY_SIZE = 256 * 1024;

export type HttpRequest<Body = never> = IncomingMessage & {
  body: Body;
};

export type HttpResponse = ServerResponse & {
  json(statusCode: number, data: unknown): void;
};

export type RequestHandler<Body = never> = (request: HttpRequest<Body>, response: HttpResponse) => void | Promise<void>;

export class HttpServer {
  private readonly routes = new Map<string, RequestHandler<unknown>>();

  public get(path: string, handler: RequestHandler) {
    this.bind('GET', path, handler);
  }

  public post<Body>(path: string, handler: RequestHandler<Body>) {
    this.bind('POST', path, handler);
  }

  public listen(port: number, callback: () => void): Server {
    const server = createServer((request, response) => {
      void this.handleRequest(request, this.createHttpResponse(response));
    });

    return server.listen(port, callback);
  }

  private bind<Body>(method: string, path: string, handler: RequestHandler<Body>) {
    const routeKey = this.getRouteKey(method, path);
    this.routes.set(routeKey, (request, response) => handler(request as HttpRequest<Body>, response));
  }

  private async handleRequest(request: IncomingMessage, response: HttpResponse) {
    try {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      const method = request.method ? request.method.toUpperCase() : null;
      const routeKey = method ? this.getRouteKey(method, path) : null;
      const handler = routeKey ? this.routes.get(routeKey) : null;

      if (!handler) {
        response.json(404, { error: 'Not found' });
        return;
      }

      const httpRequest = request as HttpRequest<unknown>;
      if (method === 'POST') {
        httpRequest.body = await this.readJsonBody(request);
      }
      await handler(httpRequest, response);
    } catch (error) {
      const statusCode = error instanceof HttpRequestError ? error.statusCode : 500;
      const message = error instanceof HttpRequestError ? error.message : 'Internal server error';

      if (!response.headersSent) {
        response.json(statusCode, { error: message });
      } else if (!response.writableEnded) {
        response.destroy(error instanceof Error ? error : undefined);
      }
    }
  }

  private async readJsonBody(request: IncomingMessage): Promise<unknown> {
    const contentLength = Number(request.headers['content-length']);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
      request.resume();
      throw new HttpRequestError(413, 'Request body is too large');
    }

    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_BODY_SIZE) {
        request.resume();
        throw new HttpRequestError(413, 'Request body is too large');
      }
      chunks.push(buffer);
    }

    if (chunks.length === 0) {
      throw new HttpRequestError(400, 'Request body is required');
    }

    try {
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (body === null || typeof body !== 'object') {
        throw new HttpRequestError(400, 'Request body must be a JSON object or array');
      }
      return body;
    } catch (error) {
      if (error instanceof HttpRequestError) {
        throw error;
      }
      throw new HttpRequestError(400, 'Invalid JSON body');
    }
  }

  private getRouteKey(method: string, path: string): string {
    return `${method}#${path}`;
  }

  private createHttpResponse(response: ServerResponse): HttpResponse {
    const httpResponse = response as HttpResponse;
    httpResponse.json = (statusCode, data) => {
      httpResponse.statusCode = statusCode;
      httpResponse.setHeader('Content-Type', 'application/json; charset=utf-8');
      httpResponse.end(JSON.stringify(data));
    };
    return httpResponse;
  }
}

class HttpRequestError extends Error {
  public constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}
