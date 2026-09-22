import express, { Express } from 'express';
import type { Server as NodeHttpServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join } from 'node:path';
import { Logger } from './core/logger';
import { ServerPaths } from './core/server-paths';

const PORT = Number(process.env.PORT) || 2048;
const HOST = process.env.HOST || '0.0.0.0';

export class HttpServer {
  public readonly app: Express;
  private server: NodeHttpServer | null = null;

  public constructor(private readonly serverPaths: ServerPaths) {
    this.app = express();
    this.app.use(express.json());
  }

  public setupPortal(): void {
    const portalFolderPath = this.serverPaths.getPortalFolderPath();
    this.app.use(express.static(portalFolderPath));
    this.app.use((request, response, next) => {
      const isApiRequest = request.path === '/api' || request.path.startsWith('/api/');
      const isStaticFileRequest = extname(request.path) !== '';
      if (request.method !== 'GET' || isApiRequest || isStaticFileRequest) {
        next();
        return;
      }
      response.sendFile(join(portalFolderPath, 'index.html'), error => {
        if (error) {
          next(error);
        }
      });
    });
  }

  public async start(): Promise<void> {
    if (this.server) {
      throw new Error('HTTP server is already running');
    }

    this.server = await new Promise((resolve, reject) => {
      const server = this.app.listen(PORT, HOST, () => {
        server.off('error', reject);
        resolve(server);
      });
      server.once('error', reject);
    });
  }

  public getListeningAddresses(): string[] {
    const addresses: string[] = [];
    for (const address of Object.values(networkInterfaces()).flatMap(f => f)) {
      if (address && address.family === 'IPv4') {
        addresses.push(`http://${address.address}:${PORT}`);
      }
    }
    return addresses;
  }

  public async close(): Promise<void> {
    const server = this.server;
    if (!server || !server.listening) {
      return;
    }
    this.server = null;
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}
