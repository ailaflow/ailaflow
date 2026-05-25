import { Sandbox } from './sandbox';

export interface SandboxExecutorRequest {
  folderPath: string;
  scriptName: string;
  /**
   * JSON serializable object that will be passed to the script via stdin.
   */
  input: object;
}

const TOKEN_PRE = '>'.repeat(20);
const TOKEN_POST = '<'.repeat(20);

export class SandboxExecutorError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export interface SandboxExecutorResult<T> {
  install: boolean;
  output: T | null;
  totalTime: number;
}

export class SandboxExecutor {
  private readonly isInstalled = new Set<string>();

  public constructor(private readonly sandbox: Sandbox) {}

  public async execute(abortSignal: AbortSignal, request: SandboxExecutorRequest): Promise<SandboxExecutorResult<string>> {
    const start = Date.now();
    const install = !this.isInstalled.has(request.folderPath);
    if (install) {
      await this.sandbox.runCommand(abortSignal, {
        folderPath: request.folderPath,
        command: 'npm',
        args: ['install']
      });
      this.isInstalled.add(request.folderPath);
    }

    const result = await this.sandbox.runCommand(abortSignal, {
      folderPath: request.folderPath,
      command: 'node',
      args: [request.scriptName],
      stdin: JSON.stringify(request.input)
    });

    if (result.code !== 0) {
      const limitedError = result.stderr.substring(0, 256);
      throw new SandboxExecutorError(
        `Script ${request.folderPath}/${request.scriptName} failed with code ${result.code} and error: ${limitedError}`
      );
    }

    const startPos = result.stdout.indexOf(TOKEN_PRE);
    const endPos = startPos >= 0 ? result.stdout.indexOf(TOKEN_POST, startPos + TOKEN_PRE.length) : -1;
    const totalTime = Date.now() - start;
    if (startPos < 0 || endPos < 0) {
      return {
        install,
        totalTime,
        output: null
      };
    }

    const output = result.stdout.substring(startPos + TOKEN_PRE.length, endPos);
    return {
      install,
      totalTime,
      output: output
    };
  }

  public async executeJSON<T extends object = object>(
    abortSignal: AbortSignal,
    request: SandboxExecutorRequest
  ): Promise<SandboxExecutorResult<T>> {
    const r0 = await this.execute(abortSignal, request);
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
