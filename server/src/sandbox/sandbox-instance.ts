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
    signal: AbortSignal,
    runtimeFolderAbsolutePath: string,
    appDataFolderAbsolutePath: string,
    sandbox: Sandbox,
    rpcHandlerProvider: SandboxRpcHandlerProvider
  ): Promise<SandboxInstance> {
    const hostPaths = new SandboxHostPaths(runtimeFolderAbsolutePath, appDataFolderAbsolutePath, sandbox.name);

    const materializer = new SandboxMaterializer(hostPaths);

    await materializer.tryMaterializeSandbox(signal, sandbox);

    const runtime = await SandboxRuntime.create(signal, hostPaths, sandbox.name, sandbox.token, sandbox.secrets, rpcHandlerProvider);

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

  public async tryMaterializeProcess(signal: AbortSignal, process: Process, handler?: HttpSseHandler<ExecuteCommandUpdate>) {
    const commit = await this.materializer.tryBeginMaterializationOfProcess(signal, process);
    if (commit) {
      await this.dependenciesInstaller.install(signal, process, handler);
      await commit();
    }
  }

  public executeCommand(
    signal: AbortSignal,
    command: ExecuteCommandRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<CommandResult> {
    return this.runtime.executeCommand(signal, command, handler);
  }

  public executeScript(
    signal: AbortSignal,
    request: SandboxScriptExecutorRequest,
    handler?: HttpSseHandler<ExecuteCommandUpdate>
  ): Promise<SandboxScriptExecutorResult> {
    return this.scriptExecutor.execute(signal, request, handler);
  }

  public tryStop(signal: AbortSignal, error?: Error): Promise<boolean> {
    return this.runtime.tryStop(signal, error);
  }
}
