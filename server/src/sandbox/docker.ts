import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class Docker {
  public constructor(private readonly cwd: string) {}

  public async build(imageTag: string, envs: Record<string, string>) {
    const args = ['build', '-t', imageTag];
    for (const [key, value] of Object.entries(envs)) {
      args.push('--build-arg', `${key}=${value}`);
    }
    args.push('-f', './Dockerfile', '.');

    await this.execDocker(args);
  }

  public async run(
    imageTag: string,
    internalPort: number,
    options?: {
      v: string;
      name?: string;
    }
  ): Promise<string> {
    const args = ['run', '-d', '-p', `127.0.0.1::${internalPort}`];
    if (options?.name) {
      args.push('--name', options.name);
    }
    if (options?.v) {
      args.push('-v', options.v);
    }
    args.push(imageTag);

    const { stdout } = await this.execDocker(args);
    const containerId = stdout.trim();
    return containerId;
  }

  public async getMappedHttpTarget(containerId: string, port: number): Promise<URL> {
    const { stdout } = await this.execDocker(['port', containerId, `${port}/tcp`]);
    const mapping = stdout.trim().split('\n')[0];
    const lastColon = mapping.lastIndexOf(':');
    if (lastColon === -1) {
      throw new Error(`Unexpected docker port mapping output: "${mapping}"`);
    }
    return new URL(`http://${mapping}`);
  }

  public async tryRemove(containerIdOrName: string): Promise<boolean> {
    const { stderr } = await this.execDocker(['rm', '-f', containerIdOrName]);
    return !stderr.includes('No such container');
  }

  private execDocker(args: string[]) {
    return execFileAsync('docker', args, { cwd: this.cwd });
  }
}
