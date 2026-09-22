import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { SandboxInstanceManager } from '../../sandbox/sandbox-instance-manager';

const inputSchema = z.object({
  command: z.string().min(1),
  cwd: z.string().min(1).optional().describe('Working directory inside the sandbox. Defaults to /app.')
});

type Input = z.infer<typeof inputSchema>;

const TERMINAL_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_LENGTH = 16_000;

export class RunTerminalCommandTool extends ZodTool<Input> {
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

  protected async handle(signal: AbortSignal, _: ToolContext, arg: Input): Promise<ZodToolExecutionResult> {
    const executionSignal = AbortSignal.any([signal, AbortSignal.timeout(TERMINAL_TIMEOUT_MS)]);

    const sandbox = await this.sandboxInstanceManager.getOrCreate(executionSignal, this.sandboxName);
    const result = await sandbox.executeCommand(executionSignal, { cwd: arg.cwd ?? '/app', command: '/bin/sh', args: ['-c', arg.command] });

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
