import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DockerInfo {
  ClientInfo: {
    Version: string;
  };
}

export class Docker {
  public constructor(private readonly hostCwd: string) {}

  public async info(abortSignal: AbortSignal): Promise<DockerInfo> {
    const { stderr, stdout } = await this.execDocker(abortSignal, ['info', '--format', '{{json .}}']);
    if (stderr.includes('Cannot connect')) {
      throw new Error('Docker is not running');
    }
    return JSON.parse(stdout);
  }

  public async build(abortSignal: AbortSignal, imageTag: string, dockerfilePath: string, envs: Record<string, string>) {
    const args = ['build', '-t', imageTag];
    for (const [key, value] of Object.entries(envs)) {
      args.push('--build-arg', `${key}=${value}`);
    }
    args.push('-f', dockerfilePath, '.');

    await this.execDocker(abortSignal, args);
  }

  public async run(
    abortSignal: AbortSignal,
    imageTag: string,
    internalPort: number,
    options?: [name: '-v' | '--network' | '--name' | '--env', string][]
  ): Promise<string> {
    const args = ['run', '--detach', '--security-opt', 'no-new-privileges', '--cap-drop', 'ALL', '--publish', `127.0.0.1::${internalPort}`];
    if (options) {
      for (const o of options) {
        args.push(o[0], o[1]);
      }
    }
    args.push(imageTag);

    const { stdout } = await this.execDocker(abortSignal, args);
    const containerId = stdout.trim();
    return containerId;
  }

  public async getMappedHttpTarget(abortSignal: AbortSignal, containerId: string, port: number): Promise<URL> {
    const { stdout } = await this.execDocker(abortSignal, ['port', containerId, `${port}/tcp`]);
    const mapping = stdout.trim().split('\n')[0];
    const lastColon = mapping.lastIndexOf(':');
    if (lastColon === -1) {
      throw new Error(`Unexpected docker port mapping output: "${mapping}"`);
    }
    return new URL(`http://${mapping}`);
  }

  public async tryRemove(abortSignal: AbortSignal, containerIdOrName: string) {
    await this.execDocker(abortSignal, ['rm', '-f', containerIdOrName]);
  }

  public async createNetwork(abortSignal: AbortSignal, networkName: string) {
    await this.execDocker(abortSignal, ['network', 'create', '--driver', 'bridge', networkName]);
  }

  public async tryRemoveNetwork(abortSignal: AbortSignal, networkName: string) {
    await this.execDocker(abortSignal, ['network', 'rm', '-f', networkName]);
  }

  private execDocker(signal: AbortSignal, args: string[]) {
    return execFileAsync('docker', args, { cwd: this.hostCwd, signal });
  }
}
