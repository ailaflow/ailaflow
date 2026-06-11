import { HttpSseHandler } from '../core/http-client';
import { Process } from '../repositories/process-repository/process-repository';
import { Sandbox } from '../repositories/sandbox-repository/sandbox-repository';
import { ExecuteCommandUpdate } from './bridge-client';
import { SandboxDependenciesInstaller } from './sandbox-dependencies-installer';
import { SandboxExecutor, SandboxExecutorRequest, SandboxExecutorResult } from './sandbox-executor';
import { SandboxHostPaths } from './sandbox-host-paths';
import { SandboxMaterializer } from './sandbox-materializer';
import { SandboxRpcHandlerProvider } from './sandbox-rpc-handler-provider';
import { SandboxRuntime } from './sandbox-runtime';

export class SandboxInstance {
  public static async create(
    abortSignal: AbortSignal,
    ailaFolderAbsolutePath: string,
    appDataFolderAbsolutePath: string,
    name: string,
    sandbox: Sandbox,
    rpcHandlerProvider: SandboxRpcHandlerProvider
  ): Promise<SandboxInstance> {
    const hostPaths = new SandboxHostPaths(ailaFolderAbsolutePath, appDataFolderAbsolutePath, name);

    const materializer = new SandboxMaterializer(hostPaths);

    await materializer.tryMaterializeSandbox(abortSignal, sandbox);

    const runtime = await SandboxRuntime.create(abortSignal, hostPaths, name, sandbox.envVariables, rpcHandlerProvider);

    const dependenciesInstaller = new SandboxDependenciesInstaller(runtime, hostPaths);
    const executor = new SandboxExecutor(runtime);
    return new SandboxInstance(materializer, runtime, dependenciesInstaller, executor);
  }

  public readonly onClose = this.runtime.onClose;

  private constructor(
    private readonly materializer: SandboxMaterializer,
    private readonly runtime: SandboxRuntime,
    private readonly dependenciesInstaller: SandboxDependenciesInstaller,
    private readonly executor: SandboxExecutor
  ) {}

  public async tryMaterializeProcess(abortSignal: AbortSignal, process: Process, handler?: HttpSseHandler<ExecuteCommandUpdate>) {
    const commit = await this.materializer.tryBeginMaterializationOfProcess(abortSignal, process);
    if (commit) {
      await this.dependenciesInstaller.install(abortSignal, process, handler);
      await commit();
    }
  }

  public execute(
    abortSignal: AbortSignal,
    request: SandboxExecutorRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<SandboxExecutorResult> {
    return this.executor.execute(abortSignal, request, handler);
  }

  public tryStop(error?: Error): Promise<boolean> {
    return this.runtime.tryStop(error);
  }
}
