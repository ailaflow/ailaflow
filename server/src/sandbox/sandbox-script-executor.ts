import { HttpSseHandler } from '../core/http-client';
import { ExecuteCommandUpdate } from './bridge-client';
import { CommandResult, SandboxRuntime } from './sandbox-runtime';

export interface SandboxScriptExecutorRequest {
  executionId: string;
  cwd: string;
  scriptName: string;
  stdin?: string;
}

export class SandboxScriptExecutorError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export interface SandboxScriptExecutorResult {
  result: CommandResult;
  totalTime: number;
}

export class SandboxScriptExecutor {
  public constructor(private readonly runtime: SandboxRuntime) {}

  public async execute(
    signal: AbortSignal,
    request: SandboxScriptExecutorRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<SandboxScriptExecutorResult> {
    const startTime = Date.now();

    const result = await this.runtime.executeCommand(
      signal,
      {
        cwd: request.cwd,
        command: 'node',
        args: [request.scriptName],
        stdin: request.stdin,
        env: {
          EXECUTION_ID: request.executionId
        }
      },
      handler
    );

    if (result.code !== 0) {
      const limitedError = result.stderr.substring(0, 512);
      throw new SandboxScriptExecutorError(
        `Script ${request.cwd}/${request.scriptName} failed with code ${result.code} and error: ${limitedError}`
      );
    }

    const totalTime = Date.now() - startTime;
    return {
      totalTime,
      result
    };
  }
}
