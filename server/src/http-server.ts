import express, { Express } from 'express';
import type { Server as NodeHttpServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join } from 'node:path';
import { Logger } from './core/logger';
import { ServerPaths } from './core/server-paths';

const PORT = process.env.PORT || 2048;

export class HttpServer {
  private readonly logger = new Logger(HttpServer.name);
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
      const server = this.app.listen(PORT, () => {
        this.logger.log(`Data folder: ${this.serverPaths.getAppDataFolderPath()}`);
        this.logListeningAddresses();
        server.off('error', reject);
        resolve(server);
      });
      server.once('error', reject);
    });
  }

  public async close(): Promise<void> {
    if (!this.server?.listening) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server!.close(error => (error ? reject(error) : resolve()));
    });
    this.server = null;
  }

  private logListeningAddresses(): void {
    this.logger.log('Server is listening on:');
    for (const networkInterface of Object.values(networkInterfaces())) {
      for (const interfaceAddress of networkInterface ?? []) {
        if (interfaceAddress.family === 'IPv4') {
          this.logger.log(`• http://${interfaceAddress.address}:${PORT}`);
        }
      }
    }
  }
}
