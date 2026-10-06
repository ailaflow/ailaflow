import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  PROCESS_VERSION,
  ProcessDefinition,
  ProcessDisplay,
  ProcessExecutionMode,
  ProcessExecutionTraceRetention,
  ScriptDefinition
} from '@ailaflow/shared';
import { Process } from '../repositories/process/process';
import { SandboxHostPaths } from './sandbox-host-paths';
import { SandboxMaterializer } from './sandbox-materializer';

test('materializes a script only when its definition changes', async () => {
  const temporaryFolder = await fs.mkdtemp(join(os.tmpdir(), 'ailaflow-materializer-'));
  try {
    const paths = new SandboxHostPaths(temporaryFolder, temporaryFolder, 'default');
    const materializer = new SandboxMaterializer(paths);
    const signal = new AbortController().signal;
    const files = [
      { path: 'package.json', mimeType: 'application/json', content: '{}' },
      { path: 'main.js', mimeType: 'text/javascript', content: 'original' }
    ];

    const firstCommit = await materializer.tryBeginMaterializationOfProcess(
      signal,
      createProcess('process-1', { sandboxName: 'default', contents: files, allowedProcessNames: [] })
    );
    assert.ok(firstCommit);
    await firstCommit();

    const materializedFile = join(paths.appFolderAbsolutePath, 'process', 'script', 'main.js');
    await fs.writeFile(materializedFile, 'local change');

    const unchangedCommit = await materializer.tryBeginMaterializationOfProcess(
      signal,
      createProcess('process-2', { sandboxName: 'default', contents: files, allowedProcessNames: [] })
    );
    assert.ok(unchangedCommit);
    assert.equal(await fs.readFile(materializedFile, 'utf8'), 'local change');
    await unchangedCommit();

    const changedCommit = await materializer.tryBeginMaterializationOfProcess(
      signal,
      createProcess('process-3', {
        sandboxName: 'default',
        allowedProcessNames: [],
        contents: files.map(file => (file.path === 'main.js' ? { ...file, content: 'changed' } : file))
      })
    );
    assert.ok(changedCommit);
    assert.equal(await fs.readFile(materializedFile, 'utf8'), 'changed');
  } finally {
    await fs.rm(temporaryFolder, { recursive: true, force: true });
  }
});

function createProcess(hash: string, script: ScriptDefinition): Process {
  const definition: ProcessDefinition = {
    sequence: [
      {
        id: 'script',
        type: 'script',
        componentType: 'task',
        name: 'Script',
        properties: { script }
      }
    ],
    properties: {
      startVariableNames: [],
      variables: [],
      version: PROCESS_VERSION
    }
  };
  return new Process(
    'process',
    '',
    '',
    ProcessDisplay.LISTED,
    ProcessExecutionMode.AI_TOOL_OR_START_FORM,
    ProcessExecutionTraceRetention.DISABLED,
    null,
    definition,
    hash,
    null,
    1,
    0,
    0,
    ['default'],
    0
  );
}
