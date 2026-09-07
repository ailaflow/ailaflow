import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';

const inputSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1).optional().describe('Working directory inside the sandbox. Defaults to /app.')
});

const TERMINAL_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_LENGTH = 16_000;

export class RunTerminalCommandTool extends ZodTool<z.infer<typeof inputSchema>> {
  public constructor(
    private readonly sandboxName: string,
    private readonly sandboxInstanceManager: SandboxInstanceManager
  ) {
    super(
      'runTerminalCommand',
      'Runs a shell command in the configured sandbox. The optional cwd sets the working directory and defaults to /app. Calls in one batch run concurrently and changes are not rolled back; run dependent commands in separate turns. Commands time out after 60 seconds and output may be truncated.',
      inputSchema
    );
  }

  protected async handle(abortSignal: AbortSignal, _: ToolContext, arg: z.infer<typeof inputSchema>): Promise<ZodToolExecutionResult> {
    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(TERMINAL_TIMEOUT_MS)]);

    const sandbox = await this.sandboxInstanceManager.getOrCreate(signal, this.sandboxName);
    const result = await sandbox.executeCommand(signal, { cwd: arg.cwd ?? '/app', command: '/bin/sh', args: ['-c', arg.command] });

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
