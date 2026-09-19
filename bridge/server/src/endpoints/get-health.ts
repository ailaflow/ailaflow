import type { HttpServer } from '../core/http-server';

export function setupGetHealthEndpoint(app: HttpServer): void {
  app.get('/health', (_request, response) => {
    response.json(200, { status: 'ok' });
  });
}
