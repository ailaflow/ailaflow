import { KvConfiguration } from '../../repositories/configuration/kv/kv-configuration';
import { KvConfigurationRepository } from '../../repositories/configuration/kv/kv-configuration-repository';

export class KvConfigurationManager {
  private cache: KvConfiguration | null = null;

  public constructor(private readonly repository: KvConfigurationRepository) {}

  public async get(abortSignal: AbortSignal): Promise<KvConfiguration> {
    if (!this.cache) {
      this.cache = await this.repository.get(abortSignal);
    }
    return this.cache.clone();
  }

  public async update(abortSignal: AbortSignal, configuration: KvConfiguration): Promise<void> {
    if (configuration.getChangedKeys().length === 0) {
      return;
    }
    await this.repository.updateChanged(abortSignal, configuration);
    this.cache = null;
  }
}
