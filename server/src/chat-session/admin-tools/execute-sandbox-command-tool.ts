import { ResourceNameNormalizer, SandboxTerminalAccess } from '@ailaflow/shared';
import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import * as z from 'zod/v4';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';

const inputSchema = z.object({
  sandboxName: z.string().min(1).describe('Sandbox name, optionally prefixed with +'),
  command: z.string().min(1),
  cwd: z.string().min(1).optional().describe('Working directory inside the sandbox. Defaults to /app.')
});

type Input = z.infer<typeof inputSchema>;

const TERMINAL_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_LENGTH = 16_000;

export class ExecuteSandboxCommandTool extends ZodTool<Input> {
  public constructor(private readonly sandboxInstanceManager: SandboxInstanceManager) {
    super(
      'global_execute_sandbox_command',
      'Executes a shell command in a sandbox that allows admin assistant terminal access. The optional cwd sets the working directory and defaults to /app. Commands time out after 60 seconds and output may be truncated.',
      inputSchema
    );
  }

  public async handle(signal: AbortSignal, _: ToolContext, input: Input): Promise<ZodToolExecutionResult> {
    const executionSignal = AbortSignal.any([signal, AbortSignal.timeout(TERMINAL_TIMEOUT_MS)]);
    const sandboxName = ResourceNameNormalizer.removePrefix(input.sandboxName, '+');
    const sandbox = await this.sandboxInstanceManager.getOrCreate(executionSignal, sandboxName);

    if (!sandbox.allowsTerminalAccess(SandboxTerminalAccess.PORTAL_AND_ADMIN_ASSISTANT)) {
      return {
        content: {
          error: `Sandbox +${sandboxName} does not allow terminal access for the admin assistant`
        }
      };
    }

    const result = await sandbox.executeCommand(executionSignal, {
      cwd: input.cwd ?? '/app',
      command: '/bin/sh',
      args: ['-c', input.command]
    });

    return {
      content: {
        code: result.code,
        stdout: result.stdout.slice(0, MAX_OUTPUT_LENGTH),
        stderr: result.stderr.slice(0, MAX_OUTPUT_LENGTH),
        truncated: result.stdout.length > MAX_OUTPUT_LENGTH || result.stderr.length > MAX_OUTPUT_LENGTH
      }
    };
  }
}
