import { HttpSseHandler } from '../core/http-client';
import { Process } from '../repositories/process/process';
import { Sandbox } from '../repositories/sandbox/sandbox';
import { ExecuteCommandRequest, ExecuteCommandUpdate } from './bridge-client';
import { SandboxDependenciesInstaller } from './sandbox-dependencies-installer';
import { SandboxScriptExecutor, SandboxScriptExecutorRequest, SandboxScriptExecutorResult } from './sandbox-script-executor';
import { SandboxHostPaths } from './sandbox-host-paths';
import { SandboxMaterializer } from './sandbox-materializer';
import { SandboxRpcHandlerProvider } from './sandbox-rpc-handler-provider';
import { CommandResult, SandboxRuntime } from './sandbox-runtime';

export class SandboxInstance {
  public static async create(
    abortSignal: AbortSignal,
    runtimeFolderAbsolutePath: string,
    appDataFolderAbsolutePath: string,
    sandbox: Sandbox,
    rpcHandlerProvider: SandboxRpcHandlerProvider
  ): Promise<SandboxInstance> {
    const hostPaths = new SandboxHostPaths(runtimeFolderAbsolutePath, appDataFolderAbsolutePath, sandbox.name);

    const materializer = new SandboxMaterializer(hostPaths);

    await materializer.tryMaterializeSandbox(abortSignal, sandbox);

    const runtime = await SandboxRuntime.create(abortSignal, hostPaths, sandbox.name, sandbox.secrets, rpcHandlerProvider);

    const dependenciesInstaller = new SandboxDependenciesInstaller(runtime, hostPaths);
    const scriptExecutor = new SandboxScriptExecutor(runtime);
    return new SandboxInstance(materializer, runtime, dependenciesInstaller, scriptExecutor);
  }

  public readonly onClose = this.runtime.onClose;

  private constructor(
    private readonly materializer: SandboxMaterializer,
    private readonly runtime: SandboxRuntime,
    private readonly dependenciesInstaller: SandboxDependenciesInstaller,
    private readonly scriptExecutor: SandboxScriptExecutor
  ) {}

  public async tryMaterializeProcess(abortSignal: AbortSignal, process: Process, handler?: HttpSseHandler<ExecuteCommandUpdate>) {
    const commit = await this.materializer.tryBeginMaterializationOfProcess(abortSignal, process);
    if (commit) {
      await this.dependenciesInstaller.install(abortSignal, process, handler);
      await commit();
    }
  }

  public executeCommand(
    abortSignal: AbortSignal,
    command: ExecuteCommandRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<CommandResult> {
    return this.runtime.executeCommand(abortSignal, command, handler);
  }

  public executeScript(
    abortSignal: AbortSignal,
    request: SandboxScriptExecutorRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<SandboxScriptExecutorResult> {
    return this.scriptExecutor.execute(abortSignal, request, handler);
  }

  public tryStop(abortSignal: AbortSignal, error?: Error): Promise<boolean> {
    return this.runtime.tryStop(abortSignal, error);
  }
}
