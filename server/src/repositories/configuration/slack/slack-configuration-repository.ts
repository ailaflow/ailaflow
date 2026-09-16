import { Transaction } from '../../../core/transaction';
import { Repository } from '../../repository';
import { SlackConfiguration } from './slack-types';

export interface SlackConfigurationRepository extends Repository {
  tryGet(abortSignal: AbortSignal): Promise<SlackConfiguration | null>;
  save(abortSignal: AbortSignal, configuration: SlackConfiguration, transaction?: Transaction): Promise<void>;
  delete(abortSignal: AbortSignal, transaction?: Transaction): Promise<boolean>;
}
