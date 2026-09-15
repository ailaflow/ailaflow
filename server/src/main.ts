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
    if (isClosing) {
      await server.close();
    }
  } catch (error) {
    if (!initAbortController.signal.aborted) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

void main();
