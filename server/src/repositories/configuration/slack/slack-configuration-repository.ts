import { Transaction } from '../../../core/transaction';
import { Repository } from '../../repository';
import { SlackConfiguration } from './slack-types';

export interface SlackConfigurationRepository extends Repository {
  tryGet(signal: AbortSignal): Promise<SlackConfiguration | null>;
  save(signal: AbortSignal, configuration: SlackConfiguration, transaction?: Transaction): Promise<void>;
  delete(signal: AbortSignal, transaction?: Transaction): Promise<boolean>;
}
