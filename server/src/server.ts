import { bootstrap, CleanupRegistry } from './bootstrap';

export class Server {
  public static async create(signal: AbortSignal): Promise<Server> {
    const registry = new CleanupRegistry();
    try {
      return new Server(registry, await bootstrap(registry, signal));
    } catch (e) {
      await registry.run(signal);
      throw e;
    }
  }

  private isClosed = false;

  public constructor(
    private readonly registry: CleanupRegistry,
    private readonly container: Awaited<ReturnType<typeof bootstrap>>
  ) {}

  public printInfo() {
    console.log('\x1b[33m');
    console.log(' ▄▀▄   ▀  ▀█        ▀█▀▀█ ▀█');
    console.log('█   █ ▀█   █  ▀▀▀▄   █▄▄   █  ▄▀▀▀▄ █   █');
    console.log('█▀▀▀█  █   █  ▄▀▀█   █     █  █   █ █ ▄ █');
    console.log('▀   ▀ ▀▀▀ ▀▀▀  ▀▀ ▀ ▀▀▀   ▀▀▀  ▀▀▀   ▀ ▀ ');
    console.log('\x1b[0m');

    console.log(`Data folder: ${this.container.serverPaths.getAppDataFolderPath()}`);
    console.log(`Version: ${this.container.versionProvider.get()}`);
    console.log(`Listening on:`);
    for (const address of this.container.httpServer.getListeningAddresses()) {
      console.log(`• ${address}`);
    }
  }

  public async close() {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    const signal = new AbortController().signal;
    await this.registry.run(signal);
    console.log('Server closed');
  }
}
