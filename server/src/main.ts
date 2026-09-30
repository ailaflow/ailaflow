import { runServer } from './server';

async function main(): Promise<void> {
  try {
    process.exitCode = await runServer();
  } catch (e) {
    process.stderr.write(`Cannot start AilaFlow: ${(e as Error)?.message ?? e}\n`);
    process.exitCode = 1;
  }
}

void main();
