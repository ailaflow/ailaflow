import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DockerInfo {
  ClientInfo: {
    Version: string;
  };
  ServerVersion: string;
}

export class Docker {
  public constructor(private readonly hostCwd: string) {}

  public async info(signal: AbortSignal): Promise<DockerInfo> {
    const { stderr, stdout } = await this.execDocker(signal, ['info', '--format', '{{json .}}']);
    const error = stderr.trim();
    if (error) {
      throw new Error(`Docker info error: ${error}`);
    }
    try {
      const info = JSON.parse(stdout) as DockerInfo;
      if (typeof info?.ClientInfo?.Version === 'string' && typeof info?.ServerVersion === 'string') {
        return info;
      }
    } catch {
      // Ignore
    }
    throw new Error(`Docker info returned invalid response: ${stdout}`);
  }

  public async build(signal: AbortSignal, imageTag: string, dockerfilePath: string, envs: Record<string, string>) {
    const args = ['build', '-t', imageTag];
    for (const [key, value] of Object.entries(envs)) {
      args.push('--build-arg', `${key}=${value}`);
    }
    args.push('-f', dockerfilePath, '.');

    await this.execDocker(signal, args);
  }

  public async run(
    signal: AbortSignal,
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

    const { stdout } = await this.execDocker(signal, args);
    const containerId = stdout.trim();
    return containerId;
  }

  public async getMappedHttpTarget(signal: AbortSignal, containerId: string, port: number): Promise<URL> {
    const { stdout } = await this.execDocker(signal, ['port', containerId, `${port}/tcp`]);
    const mapping = stdout.trim().split('\n')[0];
    const lastColon = mapping.lastIndexOf(':');
    if (lastColon === -1) {
      throw new Error(`Unexpected docker port mapping output: "${mapping}"`);
    }
    return new URL(`http://${mapping}`);
  }

  public async tryRemove(signal: AbortSignal, containerIdOrName: string) {
    await this.execDocker(signal, ['rm', '-f', containerIdOrName]);
  }

  public async createNetwork(signal: AbortSignal, networkName: string) {
    await this.execDocker(signal, ['network', 'create', '--driver', 'bridge', networkName]);
  }

  public async tryRemoveNetwork(signal: AbortSignal, networkName: string) {
    await this.execDocker(signal, ['network', 'rm', '-f', networkName]);
  }

  private execDocker(signal: AbortSignal, args: string[]) {
    return execFileAsync('docker', args, { cwd: this.hostCwd, signal });
  }
}
