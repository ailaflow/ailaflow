import { HttpSseHandler } from '../core/http-client';
import { ExecCommandUpdate } from './bridge-client';
import { SandboxRuntime } from './sandbox-runtime';

export interface SandboxExecutorRequest<T> {
  cwd: string;
  scriptName: string;
  input: T;
}

const TOKEN_PRE = '>'.repeat(20);
const TOKEN_POST = '<'.repeat(20);

export class SandboxExecutorError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export interface SandboxExecutorResult<T> {
  output: T | null;
  totalTime: number;
}

export class SandboxExecutor {
  public constructor(private readonly runtime: SandboxRuntime) {}

  public async execute(
    abortSignal: AbortSignal,
    request: SandboxExecutorRequest<string>,
    handler?: HttpSseHandler<ExecCommandUpdate>
  ): Promise<SandboxExecutorResult<string>> {
    const start = Date.now();

    const result = await this.runtime.runCommand(
      abortSignal,
      {
        cwd: request.cwd,
        command: 'node',
        args: [request.scriptName],
        stdin: request.input
      },
      handler
    );

    if (result.code !== 0) {
      const limitedError = result.stderr.substring(0, 256);
      throw new SandboxExecutorError(
        `Script ${request.cwd}/${request.scriptName} failed with code ${result.code} and error: ${limitedError}`
      );
    }

    const startPos = result.stdout.indexOf(TOKEN_PRE);
    const endPos = startPos >= 0 ? result.stdout.indexOf(TOKEN_POST, startPos + TOKEN_PRE.length) : -1;
    const totalTime = Date.now() - start;
    if (startPos < 0 || endPos < 0) {
      return {
        totalTime,
        output: null
      };
    }

    const output = result.stdout.substring(startPos + TOKEN_PRE.length, endPos);
    return {
      totalTime,
      output
    };
  }

  public async executeJSON<R extends object = object, T extends object = object>(
    abortSignal: AbortSignal,
    request: SandboxExecutorRequest<R>
  ): Promise<SandboxExecutorResult<T>> {
    const r0 = await this.execute(abortSignal, {
      cwd: request.cwd,
      scriptName: request.scriptName,
      input: JSON.stringify(request.input)
    });
    const r1 = r0 as unknown as SandboxExecutorResult<T>;
    if (!r0.output) {
      return r1;
    }
    try {
      r1.output = JSON.parse(r0.output) as T;
      return r1;
    } catch (e) {
      throw new SandboxExecutorError(`Failed to parse script output as JSON, output: ${r0.output.substring(0, 32)}`);
    }
  }
}
