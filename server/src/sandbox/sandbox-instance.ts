import { Sandbox } from '../repositories/sandbox-repository/sandbox-repository';
import { SandboxDependenciesInstaller } from './sandbox-dependencies-installer';
import { SandboxExecutor } from './sandbox-executor';
import { SandboxHostPaths } from './sandbox-host-paths';
import { SandboxMaterializer } from './sandbox-materializer';
import { SandboxRuntime, SandboxRuntimeHandler } from './sandbox-runtime';

export class SandboxInstance {
  public static async create(
    abortSignal: AbortSignal,
    ailaFolderAbsolutePath: string,
    appDataFolderAbsolutePath: string,
    name: string,
    sandbox: Sandbox,
    runtimeHandler: SandboxRuntimeHandler
  ): Promise<SandboxInstance> {
    const hostPaths = new SandboxHostPaths(ailaFolderAbsolutePath, appDataFolderAbsolutePath, name);

    const materializer = new SandboxMaterializer(hostPaths);

    await materializer.tryMaterializeSandbox(abortSignal, sandbox);

    const runtime = await SandboxRuntime.create(abortSignal, hostPaths, name, sandbox.envVariables, runtimeHandler);

    const dependenciesInstaller = new SandboxDependenciesInstaller(runtime, hostPaths);
    const executor = new SandboxExecutor(runtime);
    return new SandboxInstance(hostPaths, materializer, runtime, dependenciesInstaller, executor);
  }

  private constructor(
    public readonly hostPaths: SandboxHostPaths,
    public readonly materializer: SandboxMaterializer,
    public readonly runtime: SandboxRuntime,
    public readonly dependenciesInstaller: SandboxDependenciesInstaller,
    public readonly executor: SandboxExecutor
  ) {}
}
