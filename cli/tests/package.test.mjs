import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const cliDirectory = resolve(import.meta.dirname, '..');
const cliPath = resolve(cliDirectory, 'dist/cli.mjs');
const execFileAsync = promisify(execFile);

function getRandomPort() {
  return randomInt(49_152, 65_536);
}

async function waitForOutput(child, expectedOutput) {
  let stderr = '';
  child.stderr.on('data', chunk => (stderr += chunk));
  await new Promise((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error(`AilaFlow did not start:\n${stderr}`)), 10_000);
    child.stdout.on('data', chunk => {
      if (chunk.toString().includes(expectedOutput)) {
        clearTimeout(timeout);
        resolveReady();
      }
    });
    child.once('exit', code => {
      clearTimeout(timeout);
      rejectReady(new Error(`AilaFlow exited with code ${code}:\n${stderr}`));
    });
  });
}

async function waitForExit(child, timeout = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode };
  }
  return new Promise((resolveExit, rejectExit) => {
    const timer = setTimeout(() => rejectExit(new Error('AilaFlow did not exit in time')), timeout);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolveExit({ code, signal });
    });
  });
}

async function assertPortReleased(port) {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, '127.0.0.1', resolveListen);
  });
  await new Promise(resolveClose => server.close(resolveClose));
}

test('the packaged CLI serves the API and portal', async () => {
  const dataDirectory = await mkdtemp(resolve(tmpdir(), 'ailaflow-cli-test-'));
  const port = getRandomPort();
  const child = spawn(process.execPath, [cliPath, 'serve', '--data-dir', dataDirectory, '--port', String(port)], {
    cwd: dataDirectory,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForOutput(child, 'Status:');

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);

    const license = await fetch(`http://127.0.0.1:${port}/license-status`);
    assert.equal(license.status, 401);

    const licenseConfiguration = await fetch(`http://127.0.0.1:${port}/api/license-configuration`);
    assert.equal(licenseConfiguration.status, 401);

    const root = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(root.status, 200);
    const contentSecurityPolicy = root.headers.get('content-security-policy');
    assert.match(contentSecurityPolicy, /frame-ancestors 'none'/);
    assert.match(contentSecurityPolicy, /unsafe-eval/);
    assert.equal(root.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(root.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(root.headers.get('x-frame-options'), 'DENY');
    const rootHtml = await root.text();
    assert.match(rootHtml, /<div id=(?:"root"|root)><\/div>/);

    const deepRoute = await fetch(`http://127.0.0.1:${port}/admin/processes`);
    assert.equal(deepRoute.status, 200);
    assert.equal(await deepRoute.text(), rootHtml);

    const logo = await fetch(`http://127.0.0.1:${port}/assets/logo.png`);
    assert.equal(logo.status, 200);
    assert.equal(logo.headers.get('content-type'), 'image/png');

    const favicon = await fetch(`http://127.0.0.1:${port}/favicon.ico`);
    assert.equal(favicon.status, 200);
    assert.equal(favicon.headers.get('content-type'), 'image/vnd.microsoft.icon');

    const missingAsset = await fetch(`http://127.0.0.1:${port}/assets/missing.js`);
    assert.equal(missingAsset.status, 404);

    await access(resolve(cliDirectory, 'dist/runtime/bridge/server/index.cjs'));
    await access(resolve(cliDirectory, 'dist/runtime/assets/agent-prompt.md'));
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      assert.deepEqual(await waitForExit(child), { code: 0, signal: null });
      await assertPortReleased(port);
    }
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test('the packaged CLI handles SIGINT and closes active connections', async () => {
  const dataDirectory = await mkdtemp(resolve(tmpdir(), 'ailaflow-cli-signal-test-'));
  const port = getRandomPort();
  const child = spawn(process.execPath, [cliPath, 'serve', '--data-dir', dataDirectory, '--port', String(port)], {
    cwd: dataDirectory,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let socket;

  try {
    await waitForOutput(child, 'Status:');
    socket = createConnection(port, '127.0.0.1');
    await new Promise((resolveConnect, rejectConnect) => {
      socket.once('connect', resolveConnect);
      socket.once('error', rejectConnect);
    });
    socket.write('POST /api/install HTTP/1.1\r\nHost: localhost\r\nContent-Length: 100000\r\n\r\n{');

    child.kill('SIGINT');
    assert.deepEqual(await waitForExit(child), { code: 0, signal: null });
    await assertPortReleased(port);
  } finally {
    socket?.destroy();
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await waitForExit(child);
    }
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test('the packaged CLI fails clearly when its port is occupied', async () => {
  const dataDirectory = await mkdtemp(resolve(tmpdir(), 'ailaflow-cli-conflict-test-'));
  const port = getRandomPort();
  const blocker = createServer();
  await new Promise((resolveListen, rejectListen) => {
    blocker.once('error', rejectListen);
    blocker.listen(port, '0.0.0.0', resolveListen);
  });
  const child = spawn(process.execPath, [cliPath, 'serve', '--data-dir', dataDirectory, '--port', String(port)], {
    cwd: dataDirectory,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', chunk => (stderr += chunk));

  try {
    const exit = await waitForExit(child, 15_000);
    assert.equal(exit.code, 1);
    assert.match(stderr, new RegExp(`Cannot listen on 0\\.0\\.0\\.0:${port}`));
    assert.match(stderr, /EADDRINUSE|address already in use/);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await waitForExit(child);
    }
    await new Promise(resolveClose => blocker.close(resolveClose));
    await rm(dataDirectory, { recursive: true, force: true });
  }
});

test('the packaged CLI reports and resets its data directory', async () => {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'ailaflow-cli-data-test-'));
  const dataDirectory = resolve(temporaryDirectory, 'custom-data');

  try {
    const pathResult = await execFileAsync(process.execPath, [cliPath, 'data', 'path', '--data-dir', dataDirectory]);
    assert.equal(pathResult.stdout.trim(), dataDirectory);

    await mkdir(resolve(dataDirectory, 'nested'), { recursive: true });
    await writeFile(resolve(dataDirectory, 'database.db'), 'test');
    await writeFile(resolve(dataDirectory, 'nested/file.txt'), 'test');

    const resetResult = await execFileAsync(process.execPath, [cliPath, 'data', 'reset', '--data-dir', dataDirectory, '--force']);
    assert.match(resetResult.stdout, /AilaFlow data reset:/);
    assert.deepEqual(await readdir(dataDirectory), []);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('the packaged bridge server starts without installed dependencies', async () => {
  const child = spawn(process.execPath, [resolve(cliDirectory, 'dist/runtime/bridge/server/index.cjs')], {
    cwd: cliDirectory,
    env: {
      ...process.env,
      BRIDGE_TOKEN: 'test-bridge-token'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForOutput(child, 'Bridge is running');
    const health = await fetch('http://127.0.0.1:4096/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolveExit => child.once('exit', resolveExit));
    }
  }
});
