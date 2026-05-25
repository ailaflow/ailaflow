import { InstanceIdValidator } from '@aila/model';
import { ExecCommandRequest, ExecCommandUpdate, BridgeClient, ListenRpcUpdate, SendRpcResponseRequest } from './bridge-client';
import { Docker } from './docker';
import { Logger } from '../core/logger';
import { abortableSleep } from '../core/abortable-sleep';
import { HttpSseHandler } from '../core/http-client';
import path from 'node:path';

const BRIDGE_PORT = 4096;

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface SandboxHandler {
  onSandboxRpc(instanceId: string, type: string, payload: object): Promise<object>;
  onSandboxClose(instanceId: string, error?: Error): void;
}

export class Sandbox {
  /**
   * @throws Error if sandbox setup failed.
   */
  public static async create(
    abortSignal: AbortSignal,
    rootFolderPath: string,
    instanceId: string,
    handler: SandboxHandler
  ): Promise<Sandbox> {
    InstanceIdValidator.assert(instanceId);

    const logger = new Logger(`Sandbox:${instanceId}`);

    const instanceFolderPath = path.join(rootFolderPath, instanceId);
    const imageTag = `aila_sandbox_${instanceId}`;
    const containerName = `aila_sandbox_${instanceId}`;

    const docker = new Docker(rootFolderPath);
    await docker.tryRemove(containerName);
    await docker.build(imageTag, { INSTANCE_ID: instanceId });
    logger.log(`Built image with tag ${imageTag}`);

    try {
      const containerId = await docker.run(imageTag, BRIDGE_PORT, {
        name: containerName,
        v: `${instanceFolderPath}:/${instanceId}`
      });
      const target = await docker.getMappedHttpTarget(containerId, BRIDGE_PORT);
      const client = new BridgeClient(target);

      if (!(await checkHealth(abortSignal, client))) {
        throw new Error('Cannot reach sandbox bridge server');
      }

      logger.log(`Sandbox is ready`);
      return new Sandbox(instanceId, containerId, client, docker, logger, handler);
    } catch (e) {
      // await docker.tryRemove(containerName);
      throw e;
    }
  }

  private isRunning = true;
  private lastPingTime = Date.now();
  private healthCheckIv: ReturnType<typeof setInterval> | null = null;

  private readonly stopAbortController = new AbortController();

  public constructor(
    private readonly instanceId: string,
    private readonly containerId: string,
    private readonly client: BridgeClient,
    private readonly docker: Docker,
    private readonly logger: Logger,
    private readonly handler: SandboxHandler
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
      this.logger.error(`RPC listener failed: ${error.message}`);
      this.triggerTryStop(error);
    }
  }

  private async healthCheck() {
    this.healthCheckIv = setInterval(() => {
      const elapsed = Date.now() - this.lastPingTime;
      if (elapsed > 5_000) {
        const error = new Error(`No ping received from sandbox bridge server for ${elapsed}ms`);
        this.logger.error(error.message);
        this.triggerTryStop(error);
      }
    }, 500);
  }

  private async handleRpc(rpc: NonNullable<ListenRpcUpdate['rpc']>): Promise<void> {
    let result: SendRpcResponseRequest;
    try {
      const payload = await this.handler.onSandboxRpc(this.instanceId, rpc.type, rpc.payload);
      result = {
        id: rpc.id,
        type: rpc.type,
        payload
      };
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      result = {
        id: rpc.id,
        type: rpc.type,
        error
      };
    }
    try {
      await this.client.sendRpcResponse(this.stopAbortController.signal, result);
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.logger.error(`Failed to send ${rpc.type} RPC response to bridge: ${error}`);
    }
  }

  public async runCommand(
    abortSignal: AbortSignal,
    command: ExecCommandRequest,
    handler?: HttpSseHandler<ExecCommandUpdate>
  ): Promise<CommandResult> {
    if (!this.isRunning) {
      throw new Error('Sandbox is not running');
    }

    let code = -1;
    let stdout = '';
    let stderr = '';
    let error: Error | undefined;
    await this.client.execCommand(abortSignal, command, {
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
    void this.tryStop(error);
  }

  public async tryStop(error?: Error): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }
    this.isRunning = false;
    this.stopAbortController.abort('Stopped');

    if (this.healthCheckIv) {
      clearInterval(this.healthCheckIv);
    }

    await this.docker.tryRemove(this.containerId);

    try {
      this.handler.onSandboxClose(this.instanceId, error);
    } catch {
      this.logger.error('Sandbox close handler failed');
    }

    this.logger.log('Sandbox is stopped');
    return true;
  }
}

async function checkHealth(abortSignal: AbortSignal, client: BridgeClient): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.getHealth(abortSignal);
      return true;
    } catch (e) {
      if (attempt >= 10) {
        return false;
      }
      await abortableSleep(abortSignal, 200);
    }
  }
}
