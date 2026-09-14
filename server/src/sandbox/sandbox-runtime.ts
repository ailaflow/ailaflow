import { ExecuteCommandRequest, ExecuteCommandUpdate, BridgeClient, ListenRpcUpdate, SendRpcReplyRequest } from './bridge-client';
import { Docker } from './docker';
import { Logger } from '../core/logger';
import { HttpSseHandler } from '../core/http-client';
import { SandboxHostPaths } from './sandbox-host-paths';
import { SimpleEvent } from '@aibindkit/core';
import { SandboxRpcHandlerProvider } from './sandbox-rpc-handler-provider';
import { abortableSleep } from '../core/abortable-sleep';

const BRIDGE_PORT = 4096;

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export class SandboxRuntime {
  /**
   * @throws Error if sandbox setup failed.
   */
  public static async create(
    abortSignal: AbortSignal,
    hostPaths: SandboxHostPaths,
    name: string,
    secrets: Record<string, string>,
    rpcHandlerProvider: SandboxRpcHandlerProvider
  ): Promise<SandboxRuntime> {
    const logger = new Logger(SandboxRuntime.name);

    const imageTag = `ailaflow_sandbox_${name}`;
    const dockerName = `ailaflow_sandbox_${name}`;
    const buildArgs = {
      ...secrets,
      SANDBOX_NAME: name
    };

    const docker = new Docker(hostPaths.runtimeFolderAbsolutePath);
    await docker.tryRemove(abortSignal, dockerName);
    await docker.build(abortSignal, imageTag, hostPaths.dockerfileAbsolutePath, buildArgs);
    logger.log(`Built image for +${name}`);

    const containerId = await docker.run(abortSignal, imageTag, BRIDGE_PORT, [
      ['--name', dockerName],
      ['-v', `${hostPaths.appFolderAbsolutePath}:/app`],
      ['-v', `${hostPaths.dataFolderAbsolutePath}:/data`]
    ]);
    const target = await docker.getMappedHttpTarget(abortSignal, containerId, BRIDGE_PORT);
    const client = new BridgeClient(target);

    if (!(await checkHealth(abortSignal, client))) {
      throw new Error(`Cannot reach sandbox bridge server in +${name}`);
    }

    logger.log(`Sandbox +${name} is ready`);
    return new SandboxRuntime(name, client, docker, logger, rpcHandlerProvider);
  }

  private isRunning = true;
  private lastPingTime = Date.now();
  private healthCheckIv: ReturnType<typeof setInterval> | null = null;

  private readonly stopAbortController = new AbortController();

  public readonly onClose = new SimpleEvent<Error | undefined>();

  public constructor(
    private readonly name: string,
    private readonly client: BridgeClient,
    private readonly docker: Docker,
    private readonly logger: Logger,
    private readonly rpcHandlerProvider: SandboxRpcHandlerProvider
  ) {
    this.healthCheck();
    this.listenRpc();
  }

  private async listenRpc() {
    try {
      await this.client.listenRpc(this.stopAbortController.signal, {
        onData: update => {
          if (update.ping) {
            this.lastPingTime = Date.now();
          } else if (update.rpc) {
            void this.handleRpc(update.rpc);
          }
        },
        onClose: error => {
          if (error) {
            this.triggerTryStop(error);
          }
        }
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`RPC listener of +${this.name} failed: ${error.message}`);
      this.triggerTryStop(error);
    }
  }

  private async healthCheck() {
    this.healthCheckIv = setInterval(() => {
      const elapsed = Date.now() - this.lastPingTime;
      if (elapsed > 5_000) {
        const error = new Error(`No ping received from sandbox +${this.name} for ${elapsed}ms`);
        this.logger.error(error.message);
        this.triggerTryStop(error);
      }
    }, 500);
  }

  private async handleRpc(rpc: NonNullable<ListenRpcUpdate['rpc']>): Promise<void> {
    const abortSignal = AbortSignal.any([AbortSignal.timeout(rpc.timeout), this.stopAbortController.signal]);

    let result: SendRpcReplyRequest;
    try {
      const data = await this.rpcHandlerProvider.get(rpc.methodName).handle(abortSignal, this.name, rpc.executionId, rpc.data);
      result = {
        callId: rpc.callId,
        data
      };
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      result = {
        callId: rpc.callId,
        error
      };
    }

    try {
      await this.client.sendRpcReply(abortSignal, result);
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.logger.error(`Failed to send ${rpc.methodName} RPC response to +${this.name} bridge: ${error}`);
    }
  }

  public async executeCommand(
    abortSignal: AbortSignal,
    command: ExecuteCommandRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<CommandResult> {
    if (!this.isRunning) {
      throw new Error('Sandbox is not running');
    }

    let code = -1;
    let stdout = '';
    let stderr = '';
    let error: Error | undefined;
    await this.client.executeCommand(abortSignal, command, {
      onData(update) {
        if (update.stdout) {
          stdout += update.stdout;
        } else if (update.stderr) {
          stderr += update.stderr;
        } else if (update.close) {
          code = update.close.code;
        }
        if (handler) {
          handler.onData(update);
        }
      },
      onClose(e) {
        error = e;
        if (handler) {
          handler.onClose(e);
        }
      }
    });
    if (error) {
      throw error;
    }
    return { code, stdout, stderr };
  }

  private triggerTryStop(error?: Error) {
    const abortSignal = AbortSignal.timeout(5_000);
    void this.tryStop(abortSignal, error);
  }

  public async tryStop(abortSignal: AbortSignal, error?: Error): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }
    this.isRunning = false;
    this.stopAbortController.abort('Stopped');

    if (this.healthCheckIv) {
      clearInterval(this.healthCheckIv);
    }

    await this.docker.tryRemove(abortSignal, this.name);

    this.onClose.emit(error);

    let log = `Sandbox +${this.name} is stopped`;
    if (error) {
      log += ` due to error: ${error.message}`;
    }
    this.logger.log(log);
    return true;
  }
}

async function checkHealth(abortSignal: AbortSignal, client: BridgeClient): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.getHealth(abortSignal);
      return true;
    } catch (e) {
      if (attempt >= 40) {
        return false;
      }
      await abortableSleep(abortSignal, 250);
    }
  }
}
