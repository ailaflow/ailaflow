import { Transaction } from '../../../core/transaction';
import { Repository } from '../../repository';
import { LlmConfiguration } from './llm-configuration';
import { LlmProviderConfiguration } from './llm-provider-configuration';
import { LlmUseCaseConfiguration } from './llm-use-case-configuration';
import { LlmUseCase } from '@ailaflow/shared';

export class LlmConfigurationRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = LlmConfigurationRepositoryError.name;
  }
}

export interface LlmConfigurationRepository extends Repository {
  get(signal: AbortSignal): Promise<LlmConfiguration>;
  tryGetProvider(signal: AbortSignal, id: string): Promise<LlmProviderConfiguration | null>;
  insertProvider(signal: AbortSignal, provider: LlmProviderConfiguration, transaction?: Transaction): Promise<void>;
  updateProvider(signal: AbortSignal, provider: LlmProviderConfiguration, transaction?: Transaction): Promise<void>;
  deleteProvider(signal: AbortSignal, id: string, transaction?: Transaction): Promise<boolean>;
  saveUseCases(
    signal: AbortSignal,
    configurations: LlmUseCaseConfiguration[],
    removedUseCases: LlmUseCase[],
    transaction?: Transaction
  ): Promise<void>;
}
