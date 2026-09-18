import { KvConfigurationManager } from '../kv/kv-configuration-manager';

export class PublicFormUrlGenerator {
  public constructor(private readonly manager: KvConfigurationManager) {}

  public getLinkValidityHours(): number {
    return 2;
  }

  public async generateTaskFormUrl(abortSignal: AbortSignal, _userName: string, taskId: string): Promise<string | null> {
    const kv = await this.manager.get(abortSignal);
    if (kv.publicUrl) {
      return new URL(`public-form/tasks/${taskId}`, kv.publicUrl).toString();
    }
    return null;
  }

  public async generateProcessStartFormUrl(abortSignal: AbortSignal, _userName: string, processName: string): Promise<string | null> {
    const kv = await this.manager.get(abortSignal);
    if (kv.publicUrl) {
      return new URL(`public-form/processes/${processName}`, kv.publicUrl).toString();
    }
    return null;
  }
}
