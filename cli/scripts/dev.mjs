import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import createConfigurations from '../webpack.config.mjs';

const cliDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootDirectory = resolve(cliDirectory, '..');
const outputDirectory = resolve(cliDirectory, 'dist');
const dataDirectory = join(homedir(), '.aila');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(dataDirectory, { recursive: true });

const compiler = webpack(createConfigurations({}, { mode: 'development' }));
let serverProcess = null;
let serverHash = null;
let restartQueue = Promise.resolve();

function stopServer() {
  return new Promise(resolveStop => {
    if (!serverProcess || serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
      resolveStop();
      return;
    }
    serverProcess.once('exit', resolveStop);
    serverProcess.kill('SIGTERM');
  });
}

async function restartServer() {
  await stopServer();
  const environmentFile = resolve(rootDirectory, 'server/.env');
  const nodeArguments = [
    ...(existsSync(environmentFile) ? [`--env-file=${environmentFile}`] : []),
    resolve(outputDirectory, 'server/index.cjs')
  ];
  serverProcess = spawn(process.execPath, nodeArguments, {
    cwd: rootDirectory,
    stdio: 'inherit',
    env: {
      ...process.env,
      AILA_DATA_DIR: dataDirectory,
      AILA_PORTAL_DIR: resolve(outputDirectory, 'portal'),
      AILA_RUNTIME_DIR: resolve(outputDirectory, 'runtime')
    }
  });
  serverProcess.on('error', error => process.stderr.write(`Cannot start server: ${error.message}\n`));
}

const watching = compiler.watch(
  {
    aggregateTimeout: 100,
    ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/data/**', '**/temp/**'],
    poll: 500
  },
  (error, stats) => {
    if (error) {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      return;
    }

    process.stdout.write(`${stats.toString({ colors: true, preset: 'errors-warnings' })}\n`);
    const serverStats = stats.stats.find(item => item.compilation.name === 'server');
    if (serverStats && !serverStats.hasErrors() && serverStats.hash !== serverHash) {
      serverHash = serverStats.hash;
      restartQueue = restartQueue.then(restartServer);
    }
  }
);

async function shutdown() {
  await stopServer();
  watching.close(() => process.exit());
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
