import { MyProcessAccessQuerier } from '../queriers/my-process/my-process-access-querier';
import { Process } from '../repositories/process/process';
import { ProcessManager } from './process-manager';

export class UserProcessProvider {
  public constructor(
    private readonly accessQuerier: MyProcessAccessQuerier,
    private readonly processManager: ProcessManager
  ) {}

  public async tryGet(abortSignal: AbortSignal, userName: string, processName: string): Promise<Process | null> {
    const hasAccess = await this.accessQuerier.hasAccess(abortSignal, userName, processName);
    if (!hasAccess) {
      return null;
    }
    const process = await this.processManager.tryGetByName(abortSignal, processName);
    if (!process) {
      throw new Error('Process not found but access was granted');
    }
    return process;
  }
}
