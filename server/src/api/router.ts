import { Express, Request, Response } from 'express';
import { Endpoint } from './endpoint';
import { Logger } from '../core/logger';

export class Router {
  private readonly logger = new Logger(Router.name);

  public constructor(
    private readonly app: Express,
    private readonly endpoints: Endpoint[]
  ) {}

  public setup() {
    for (const endpoint of this.endpoints) {
      this.app[endpoint.method](endpoint.path, async (req: Request, res: Response) => {
        try {
          const jsonOrEmpty = await endpoint.handle(req, res);
          if (jsonOrEmpty) {
            res.json(jsonOrEmpty).end();
          }
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          this.logger.error(`Error occurred while handling ${endpoint.path}: ${error}`);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      });
    }
  }
}
