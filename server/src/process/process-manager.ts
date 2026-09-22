import { Process } from '../repositories/process/process';
import { ProcessRepository } from '../repositories/process/process-repository';
import { ProcessDefinitionUpgrader } from './process-definition-upgrader';

export class ProcessManager {
  private readonly cache: Map<string, Process> = new Map();

  public constructor(
    private readonly repository: ProcessRepository,
    private readonly upgrader: ProcessDefinitionUpgrader
  ) {}

  public async tryGetByName(signal: AbortSignal, name: string): Promise<Process | null> {
    const cached = this.cache.get(name);
    if (cached) {
      return cached;
    }

    const process = await this.repository.tryGetByName(signal, name);
    if (process) {
      this.upgrader.tryUpgrade(process.definition);
      this.cache.set(name, process);
    }
    return process;
  }

  public async update(signal: AbortSignal, process: Process) {
    await this.repository.update(signal, process);
  }

  public async delete(signal: AbortSignal, name: string): Promise<boolean> {
    const success = await this.repository.delete(signal, name);
    if (success) {
      this.cache.delete(name);
    }
    return success;
  }
}
