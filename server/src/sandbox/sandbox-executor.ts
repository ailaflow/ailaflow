import { HttpSseHandler } from '../core/http-client';
import { ExecuteCommandUpdate } from './bridge-client';
import { CommandResult, SandboxRuntime } from './sandbox-runtime';

export interface SandboxExecutorRequest {
  cwd: string;
  scriptName: string;
  stdin?: string;
  executionToken?: string;
}

export class SandboxExecutorError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export interface SandboxExecutorResult {
  result: CommandResult;
  totalTime: number;
}

export class SandboxExecutor {
  public constructor(private readonly runtime: SandboxRuntime) {}

  public async execute(
    abortSignal: AbortSignal,
    request: SandboxExecutorRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<SandboxExecutorResult> {
    const start = Date.now();

    const result = await this.runtime.runCommand(
      abortSignal,
      {
        cwd: request.cwd,
        command: 'node',
        args: [request.scriptName],
        stdin: request.stdin,
        env: request.executionToken
          ? {
              EXECUTION_TOKEN: request.executionToken
            }
          : {}
      },
      handler
    );

    if (result.code !== 0) {
      const limitedError = result.stderr.substring(0, 256);
      throw new SandboxExecutorError(
        `Script ${request.cwd}/${request.scriptName} failed with code ${result.code} and error: ${limitedError}`
      );
    }

    const totalTime = Date.now() - start;
    return {
      totalTime,
      result
    };
  }
}
