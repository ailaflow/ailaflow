import type { Express } from 'express';

export function setupHealthEndpoint(app: Express): void {
  app.get('/', (_, res) => {
    res.status(200).send('Bridge is running');
  });

  app.get('/health', (_, res) => {
    res.status(200).send({ status: 'ok' });
  });
}
