import { bootstrap, CleanupRegistry } from './bootstrap';

export const SERVER_SHUTDOWN_TIMEOUT_MS = 10_000;

export async function runServer(): Promise<number> {
  const startupAbortController = new AbortController();
  let resolveShutdown!: () => void;
  let shutdownRequested = false;
  const shutdownRequestedPromise = new Promise<void>(resolve => {
    resolveShutdown = resolve;
  });
  const requestShutdown = () => {
    if (shutdownRequested) {
      return;
    }
    shutdownRequested = true;
    startupAbortController.abort();
    resolveShutdown();
  };

  process.once('SIGINT', requestShutdown);
  process.once('SIGTERM', requestShutdown);

  let server: Server | null = null;
  try {
    server = await Server.create(startupAbortController.signal);
    await server.printInfo(startupAbortController.signal);
    await shutdownRequestedPromise;
    return 0;
  } catch (error) {
    if (shutdownRequested) {
      return 0;
    }
    throw error;
  } finally {
    process.removeListener('SIGINT', requestShutdown);
    process.removeListener('SIGTERM', requestShutdown);
    await server?.close(AbortSignal.timeout(SERVER_SHUTDOWN_TIMEOUT_MS));
  }
}

export class Server {
  public static async create(signal: AbortSignal): Promise<Server> {
    const registry = new CleanupRegistry();
    try {
      return new Server(registry, await bootstrap(registry, signal));
    } catch (e) {
      await registry.run(AbortSignal.timeout(SERVER_SHUTDOWN_TIMEOUT_MS));
      throw e;
    }
  }

  public constructor(
    private readonly registry: CleanupRegistry,
    private readonly container: Awaited<ReturnType<typeof bootstrap>>
  ) {}

  private logo(m: string) {
    console.log(`\x1b[43m\x1b[30m${m}\x1b[0m`);
  }

  private error(m: string) {
    console.log(`\x1b[41m${m}\x1b[0m`);
  }

  private kv(k: string, v: string) {
    console.log(`\x1b[90m${k}: \x1b[37m${v}\x1b[0m`);
  }

  public async printInfo(signal: AbortSignal) {
    const result = await this.container.sandboxHostDiagnostician.diagnose(signal);

    this.logo('                                           ');
    this.logo('  ▄▀▄   ▀  ▀█        ▀█▀▀█ ▀█              ');
    this.logo(' █   █ ▀█   █  ▀▀▀▄   █▄▄   █  ▄▀▀▀▄ █   █ ');
    this.logo(' █▀▀▀█  █   █  ▄▀▀█   █     █  █   █ █ ▄ █ ');
    this.logo(' ▀   ▀ ▀▀▀ ▀▀▀  ▀▀ ▀ ▀▀▀   ▀▀▀  ▀▀▀   ▀ ▀  ');
    this.logo('                                           ');

    this.kv('Version', this.container.versionProvider.get());
    this.kv('Data folder', result.dataFolderPath);

    if (!result.isAppFolderReadable) {
      this.error(`${result.appFolderPath} is not readable`);
    }
    if (!result.isDataFolderWritable) {
      this.error(`${result.dataFolderPath} is not writable`);
    }
    if (result.dockerError) {
      this.error(`Docker error: ${result.dockerError}`);
    }
    for (const address of this.container.httpServer.getListeningAddresses()) {
      this.kv('Server', address);
    }
    this.kv('Status', 'running');
  }

  public async close(signal: AbortSignal): Promise<void> {
    await this.registry.run(signal);
    this.kv('Status', 'closed');
  }
}
