import express, { Express } from 'express';
import type { Server as NodeHttpServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname } from 'node:path';
import { cspMiddleware } from './api/auth/csp-middleware';
import { ServerPaths } from './core/server-paths';

const PORT = Number(process.env.PORT) || 2048;
const HOST = process.env.HOST?.trim() || '0.0.0.0';
const TRUST_PROXY = process.env.TRUST_PROXY?.trim();
const DRAIN_TIMEOUT_MS = 4_000;

export class HttpServer {
  public readonly app: Express;
  private server: NodeHttpServer | null = null;

  public constructor(private readonly serverPaths: ServerPaths) {
    this.app = express();
    if (TRUST_PROXY) {
      this.app.set('trust proxy', parseBoolOrString(TRUST_PROXY));
    }
    this.app.disable('x-powered-by');
    this.app.use(cspMiddleware());
    this.app.use(express.json({ limit: '5mb' }));
    this.app.use(express.urlencoded({ limit: '5mb' }));
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
      response.sendFile('index.html', { root: portalFolderPath }, error => {
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
      const server = this.app.listen(PORT, HOST);
      const listening = () => {
        server.off('error', failed);
        resolve(server);
      };
      const failed = (error: Error) => {
        server.off('listening', listening);
        reject(new Error(`Cannot listen on ${HOST}:${PORT}: ${error.message}`, { cause: error }));
      };
      server.once('listening', listening);
      server.once('error', failed);
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

  public async close(signal: AbortSignal): Promise<void> {
    const server = this.server;
    if (!server) {
      return;
    }
    this.server = null;

    const forceClose = () => server.closeAllConnections();
    const forceCloseTimer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
    const abort = () => forceClose();

    signal.addEventListener('abort', abort, { once: true });
    try {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
    } finally {
      clearTimeout(forceCloseTimer);
      signal.removeEventListener('abort', abort);
    }
  }
}

function parseBoolOrString(v: string): boolean | string {
  if (v === 'true') {
    return true;
  }
  if (v === 'false') {
    return false;
  }
  return v;
}
