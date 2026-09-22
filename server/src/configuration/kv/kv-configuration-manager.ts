import { KvConfiguration } from '../../repositories/configuration/kv/kv-configuration';
import { KvConfigurationRepository } from '../../repositories/configuration/kv/kv-configuration-repository';

export class KvConfigurationManager {
  private cache: KvConfiguration | null = null;

  public constructor(private readonly repository: KvConfigurationRepository) {}

  public async get(signal: AbortSignal): Promise<KvConfiguration> {
    if (!this.cache) {
      this.cache = await this.repository.get(signal);
    }
    return this.cache.clone();
  }

  public async update(signal: AbortSignal, configuration: KvConfiguration): Promise<void> {
    if (configuration.getChangedKeys().length === 0) {
      return;
    }
    signal.throwIfAborted();
    await this.repository.updateChanged(signal, configuration);
    this.cache = null;
  }
}
