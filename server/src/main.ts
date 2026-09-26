import { Server } from './server';

async function main() {
  const initAbortController = new AbortController();
  let server: Server | null = null;
  let isClosing = false;

  const close = async () => {
    if (isClosing) {
      return;
    }
    isClosing = true;
    initAbortController.abort();
    await server?.close();
  };

  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
  process.once('disconnect', () => void close());

  try {
    server = await Server.create(initAbortController.signal);
    await server.printInfo(initAbortController.signal);
  } catch (e) {
    if (!initAbortController.signal.aborted) {
      throw e;
    }
  }
}

void main();
