import { Express, Request, Response } from 'express';
import { Endpoint } from './framework/endpoint';
import { Logger } from '../core/logger';
import { AuthMiddleware } from './auth/auth-middleware';
import { EndpointError } from './framework/endpoint-error';

export class Router {
  private readonly logger = new Logger(Router.name);

  public constructor(
    private readonly app: Express,
    private readonly endpoints: Endpoint[],
    private readonly authMiddleware: AuthMiddleware
  ) {}

  public setup() {
    for (const endpoint of this.endpoints) {
      const handler = async (req: Request, res: Response) => {
        try {
          if (endpoint.auth) {
            const admin = endpoint.admin ?? false;
            if (await this.authMiddleware.handle(admin, req, res)) {
              return;
            }
          }

          const jsonOrVoid = await endpoint.handle(req, res);
          if (jsonOrVoid) {
            res.json(jsonOrVoid).end();
          }
        } catch (e) {
          if (e instanceof EndpointError) {
            res.status(e.status).json({ error: e.message });
            return;
          }

          const error = e instanceof Error ? e : new Error(String(e));
          this.logger.error(`Error occurred while handling ${endpoint.path}: ${error}`);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      };

      this.app[endpoint.method](endpoint.path, handler);
      this.logger.log(`Registered endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path}`);
    }
  }
}
