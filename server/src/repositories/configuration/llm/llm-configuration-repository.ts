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
  get(abortSignal: AbortSignal): Promise<LlmConfiguration>;
  tryGetProvider(abortSignal: AbortSignal, id: string): Promise<LlmProviderConfiguration | null>;
  insertProvider(abortSignal: AbortSignal, provider: LlmProviderConfiguration, transaction?: Transaction): Promise<void>;
  updateProvider(abortSignal: AbortSignal, provider: LlmProviderConfiguration, transaction?: Transaction): Promise<void>;
  deleteProvider(abortSignal: AbortSignal, id: string, transaction?: Transaction): Promise<boolean>;
  saveUseCases(
    abortSignal: AbortSignal,
    configurations: LlmUseCaseConfiguration[],
    removedUseCases: LlmUseCase[],
    transaction?: Transaction
  ): Promise<void>;
}
