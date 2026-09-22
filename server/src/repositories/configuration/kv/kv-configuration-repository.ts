import { Transaction } from '../../../core/transaction';
import { Repository } from '../../repository';
import { KvConfiguration } from './kv-configuration';

export interface KvConfigurationRepository extends Repository {
  get(signal: AbortSignal): Promise<KvConfiguration>;
  updateChanged(signal: AbortSignal, configuration: KvConfiguration, transaction?: Transaction): Promise<void>;
}
