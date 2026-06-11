import type { Express } from 'express';

export function setupGetHealthEndpoint(app: Express): void {
  app.get('/health', (_, res) => {
    res.status(200).send({ status: 'ok' });
  });
}
