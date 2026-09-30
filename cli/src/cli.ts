import { mkdir, readdir, realpath, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { ArgsParser, help } from './arguments';

interface ServeOptions {
  dataDirectory: string;
  port: number;
}

async function serve(options: ServeOptions): Promise<number> {
  await mkdir(options.dataDirectory, { recursive: true });

  const distributionDirectory = dirname(fileURLToPath(import.meta.url));
  process.env.PORT = String(options.port);
  process.env.AILAFLOW_DATA_DIR = options.dataDirectory;
  process.env.AILAFLOW_PORTAL_DIR = join(distributionDirectory, 'portal');
  process.env.AILAFLOW_RUNTIME_DIR = join(distributionDirectory, 'runtime');

  const { runServer } = await import('../../server/src/server');
  return runServer();
}

function resolveDataDirectory(value: string): string {
  return resolve(value);
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function assertSafeDataDirectory(dataDirectory: string): void {
  const resolvedDirectory = resolve(dataDirectory);
  if (resolvedDirectory === parse(resolvedDirectory).root) {
    throw new Error('Refusing to reset the filesystem root');
  }
  if (resolvedDirectory === resolve(homedir())) {
    throw new Error('Refusing to reset the home directory');
  }
}

async function confirmReset(dataDirectory: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Data reset requires an interactive terminal. Use --force to skip confirmation.');
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`Permanently delete all AilaFlow data in ${dataDirectory}? [y/N] `);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    prompt.close();
  }
}

async function resetData(dataDirectory: string, force: boolean): Promise<void> {
  assertSafeDataDirectory(dataDirectory);
  await mkdir(dataDirectory, { recursive: true });

  const actualDirectory = await realpath(dataDirectory);
  assertSafeDataDirectory(actualDirectory);
  if (!force && !(await confirmReset(actualDirectory))) {
    process.stdout.write('Data reset cancelled.\n');
    return;
  }

  const entries = await readdir(actualDirectory);
  await Promise.all(entries.map(entry => rm(join(actualDirectory, entry), { recursive: true, force: true })));
  process.stdout.write(`AilaFlow data reset: ${actualDirectory}\n`);
}

async function main(): Promise<void> {
  try {
    const parser = new ArgsParser(process.argv);
    if (parser.hasArg('help') || parser.hasArg('h')) {
      process.stdout.write(`${help}\n`);
      return;
    }

    const command = parser.getCommand('serve');
    const dataDirectory = resolveDataDirectory(parser.getArg('data-dir', join(homedir(), '.ailaflow')));
    if (command === 'data path') {
      parser.assertAllowedArgs(['data-dir']);
      process.stdout.write(`${dataDirectory}\n`);
      return;
    }
    if (command === 'data reset') {
      parser.assertAllowedArgs(['data-dir', 'force']);
      await resetData(dataDirectory, parser.hasArg('force'));
      return;
    }
    if (command === 'serve') {
      parser.assertAllowedArgs(['data-dir', 'port']);
      process.exitCode = await serve({
        dataDirectory,
        port: parsePort(parser.getArg('port', '2048'))
      });
      return;
    }
    throw new Error(`Unknown command: ${command}`);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n\n${help}\n`);
    process.exitCode = 1;
  }
}

void main();
