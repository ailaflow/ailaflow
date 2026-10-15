import { ToolContext } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME, SandboxTerminalAccess } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';
import { ExecuteSandboxCommandTool } from './execute-sandbox-command-tool';

test('executes a command when the sandbox allows admin assistant terminal access', async () => {
  const manager = {
    getOrCreate: async (_: AbortSignal, sandboxName: string) => {
      assert.equal(sandboxName, 'default');
      return {
        allowsTerminalAccess: (access: SandboxTerminalAccess) => {
          assert.equal(access, SandboxTerminalAccess.PORTAL_AND_ADMIN_ASSISTANT);
          return true;
        },
        executeCommand: async (_: AbortSignal, command: unknown) => {
          assert.deepEqual(command, {
            cwd: '/app',
            command: '/bin/sh',
            args: ['-c', 'echo hello']
          });
          return { code: 0, stdout: 'hello\n', stderr: '' };
        }
      };
    }
  } as unknown as SandboxInstanceManager;
  const tool = new ExecuteSandboxCommandTool(manager);

  const result = await tool.handle(new AbortController().signal, createContext(), {
    sandboxName: '+default',
    command: 'echo hello'
  });

  assert.deepEqual(result.content, {
    code: 0,
    stdout: 'hello\n',
    stderr: '',
    truncated: false
  });
});

test('rejects a command when the sandbox does not allow admin assistant terminal access', async () => {
  let commandWasExecuted = false;
  const manager = {
    getOrCreate: async () => ({
      allowsTerminalAccess: () => false,
      executeCommand: async () => {
        commandWasExecuted = true;
        return { code: 0, stdout: '', stderr: '' };
      }
    })
  } as unknown as SandboxInstanceManager;
  const tool = new ExecuteSandboxCommandTool(manager);

  const result = await tool.handle(new AbortController().signal, createContext(), {
    sandboxName: 'restricted',
    command: 'echo denied',
    cwd: '/data'
  });

  assert.deepEqual(result.content, {
    error: 'Sandbox +restricted does not allow terminal access for the admin assistant'
  });
  assert.equal(commandWasExecuted, false);
});

function createContext(): ToolContext {
  return {
    sessionId: `admin:admin:${DEFAULT_CHANNEL_NAME}`,
    sessionToken: ''
  };
}
