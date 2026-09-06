import { Repository } from '../../repository';
import { KvConfiguration } from './kv-configuration';

export interface KvConfigurationRepository extends Repository {
  get(abortSignal: AbortSignal): Promise<KvConfiguration>;
  updateChanged(abortSignal: AbortSignal, configuration: KvConfiguration): Promise<void>;
}
