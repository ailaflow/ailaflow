import { Transaction } from '../core/transaction';
import { Process } from '../repositories/process/process';
import { ProcessRepository } from '../repositories/process/process-repository';
import { ProcessResourceId } from '../repositories/process/process-resource-id';
import { ResourceAccess, ResourceAccessRepository } from '../repositories/resource-access/resource-access-repository';
import { ProcessDefinitionUpgrader } from './process-definition-upgrader';

export class ProcessManager {
  private readonly cache: Map<string, Process> = new Map();

  public constructor(
    private readonly processRepository: ProcessRepository,
    private readonly resourceAccessRepository: ResourceAccessRepository,
    private readonly upgrader: ProcessDefinitionUpgrader
  ) {}

  public async tryGetByName(signal: AbortSignal, name: string): Promise<Process | null> {
    const cached = this.cache.get(name);
    if (cached) {
      return cached;
    }

    const process = await this.processRepository.tryGetByName(signal, name);
    if (process) {
      this.upgrader.tryUpgrade(process.definition);
      this.cache.set(name, process);
    }
    return process;
  }

  public async insert(signal: AbortSignal, process: Process) {
    const resourceId = ProcessResourceId.create(process.name);
    const resourceAccess = ResourceAccess.createFromAccessExpression(resourceId, process.userAccessExpression);

    const transaction = Transaction.begin();
    try {
      await this.processRepository.insert(signal, process, transaction);
      await this.resourceAccessRepository.replace(signal, resourceAccess, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  public async update(signal: AbortSignal, process: Process) {
    const resourceId = ProcessResourceId.create(process.name);
    const resourceAccess = ResourceAccess.createFromAccessExpression(resourceId, process.userAccessExpression);

    const transaction = Transaction.begin();
    try {
      await this.processRepository.update(signal, process, transaction);
      await this.resourceAccessRepository.replace(signal, resourceAccess, transaction);
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  public async delete(signal: AbortSignal, name: string): Promise<boolean> {
    const success = await this.processRepository.delete(signal, name);
    if (success) {
      this.cache.delete(name);
    }
    return success;
  }
}
