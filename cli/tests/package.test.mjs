import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const cliDirectory = resolve(import.meta.dirname, '..');
const cliPath = resolve(cliDirectory, 'dist/cli.mjs');
const execFileAsync = promisify(execFile);

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

test('the packaged CLI serves the API and portal', async () => {
  const dataDirectory = await mkdtemp(resolve(tmpdir(), 'ailaflow-cli-test-'));
  const port = 21_481;
  const child = spawn(process.execPath, [cliPath, 'serve', '--data-dir', dataDirectory, '--port', String(port)], {
    cwd: cliDirectory,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForOutput(child, 'Listening on:');

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);

    const license = await fetch(`http://127.0.0.1:${port}/license-status`);
    assert.equal(license.status, 401);

    const licenseConfiguration = await fetch(`http://127.0.0.1:${port}/api/license-configuration`);
    assert.equal(licenseConfiguration.status, 401);

    const root = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(root.status, 200);
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
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
      await new Promise(resolveExit => child.once('exit', resolveExit));
    }
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
