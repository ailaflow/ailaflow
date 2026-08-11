import { ALL_LLM_USE_CASES, LlmProviderType, strLlmUseCase } from '@aila/model';
import type {
  FetchLlmProviderModelsRequest,
  GetLlmConfigurationResponse,
  LlmProviderDto,
  SaveLlmProviderRequest,
  SaveLlmUseCaseAssignmentsRequest
} from '@aila/model';
import { useMemo, useState } from 'react';
import type { LlmProviderDraft, LlmUseCaseDraft } from '../../views/configuration/llm-configuration-view';

export interface LlmConfigurationState {
  providers: LlmProviderDto[];
  useCases: LlmUseCaseDraft[];
  providerDraft: LlmProviderDraft | null;
  canFetchProviderModels: boolean;
  canSaveProvider: boolean;
  canSaveUseCases: boolean;
  startProviderCreation(): void;
  startProviderEdit(provider: LlmProviderDto): void;
  cancelProviderEdit(): void;
  updateProviderDraft(delta: Partial<LlmProviderDraft>): void;
  toFetchProviderModelsRequest(): FetchLlmProviderModelsRequest;
  providerModelsFetched(models: string[]): void;
  toSaveProviderRequest(): SaveLlmProviderRequest;
  providerSaved(): void;
  providerDeleted(id: string): void;
  updateUseCase(useCase: LlmUseCaseDraft['useCase'], delta: Partial<Pick<LlmUseCaseDraft, 'providerId' | 'model'>>): void;
  toSaveUseCasesRequest(): SaveLlmUseCaseAssignmentsRequest;
  useCasesSaved(): void;
}

export function useLlmConfigurationState(initial: GetLlmConfigurationResponse): LlmConfigurationState {
  const [providers, setProviders] = useState(initial.providers);
  const [useCases, setUseCases] = useState<LlmUseCaseDraft[]>(() =>
    ALL_LLM_USE_CASES.map(useCase => {
      const saved = initial.useCases.find(item => item.useCase === useCase);
      return {
        useCase,
        label: strLlmUseCase(useCase),
        providerId: saved?.providerId ?? '',
        model: saved?.model ?? ''
      };
    })
  );
  const [savedUseCases, setSavedUseCases] = useState(() => serializeUseCases(useCases));
  const [providerDraft, setProviderDraft] = useState<LlmProviderDraft | null>(null);

  const canSaveProvider = useMemo(() => {
    if (!providerDraft || !providerDraft.name.trim()) {
      return false;
    }
    if (providerDraft.type === LlmProviderType.OPENAI_COMPATIBLE && !isValidUrl(providerDraft.baseUrl)) {
      return false;
    }
    return providerDraft.hasApiKey || providerDraft.apiKey.trim().length > 0;
  }, [providerDraft]);

  const canFetchProviderModels = useMemo(() => {
    if (!providerDraft) {
      return false;
    }
    if (providerDraft.type === LlmProviderType.OPENAI_COMPATIBLE && !isValidUrl(providerDraft.baseUrl)) {
      return false;
    }
    return providerDraft.hasApiKey || providerDraft.apiKey.trim().length > 0;
  }, [providerDraft]);

  const canSaveUseCases = useMemo(() => {
    const isValid = useCases.every(item => {
      if (!item.providerId && !item.model.trim()) {
        return true;
      }
      const provider = providers.find(candidate => candidate.id === item.providerId);
      return Boolean(provider?.models.includes(item.model));
    });
    return isValid && serializeUseCases(useCases) !== savedUseCases;
  }, [providers, savedUseCases, useCases]);

  return {
    providers,
    useCases,
    providerDraft,
    canFetchProviderModels,
    canSaveProvider,
    canSaveUseCases,
    startProviderCreation: () =>
      setProviderDraft({
        id: crypto.randomUUID(),
        insert: true,
        name: '',
        type: LlmProviderType.OPENAI,
        baseUrl: '',
        apiKey: '',
        hasApiKey: false,
        models: []
      }),
    startProviderEdit: provider =>
      setProviderDraft({
        id: provider.id,
        insert: false,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl ?? '',
        apiKey: '',
        hasApiKey: provider.hasApiKey,
        models: provider.models
      }),
    cancelProviderEdit: () => setProviderDraft(null),
    updateProviderDraft: delta => setProviderDraft(current => (current ? { ...current, ...delta } : null)),
    toFetchProviderModelsRequest: () => {
      if (!providerDraft) {
        throw new Error('No LLM provider is being edited');
      }
      return {
        id: providerDraft.insert ? undefined : providerDraft.id,
        type: providerDraft.type,
        baseUrl: providerDraft.type === LlmProviderType.OPENAI_COMPATIBLE ? providerDraft.baseUrl : null,
        apiKey: providerDraft.apiKey.trim() || undefined
      };
    },
    providerModelsFetched: models => setProviderDraft(current => (current ? { ...current, models } : null)),
    toSaveProviderRequest: () => {
      if (!providerDraft) {
        throw new Error('No LLM provider is being edited');
      }
      return {
        insert: providerDraft.insert,
        id: providerDraft.id,
        name: providerDraft.name,
        type: providerDraft.type,
        baseUrl: providerDraft.type === LlmProviderType.OPENAI_COMPATIBLE ? providerDraft.baseUrl : null,
        apiKey: providerDraft.apiKey.trim() || undefined,
        models: providerDraft.models
      };
    },
    providerSaved: () => {
      if (!providerDraft) {
        throw new Error('No LLM provider is being edited');
      }
      const provider: LlmProviderDto = {
        id: providerDraft.id,
        name: providerDraft.name.trim(),
        type: providerDraft.type,
        baseUrl:
          providerDraft.type === LlmProviderType.OPENAI_COMPATIBLE ? new URL(providerDraft.baseUrl).toString().replace(/\/$/, '') : null,
        hasApiKey: true,
        models: [...new Set(providerDraft.models.map(model => model.trim()))].sort((a, b) => a.localeCompare(b))
      };
      setProviders(current => {
        const exists = current.some(item => item.id === provider.id);
        const next = exists ? current.map(item => (item.id === provider.id ? provider : item)) : [...current, provider];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setProviderDraft(null);
    },
    providerDeleted: id => setProviders(current => current.filter(provider => provider.id !== id)),
    updateUseCase: (useCase, delta) =>
      setUseCases(current => current.map(item => (item.useCase === useCase ? { ...item, ...delta } : item))),
    toSaveUseCasesRequest: () => ({
      assignments: useCases.map(item => ({
        useCase: item.useCase,
        providerId: item.providerId || null,
        model: item.providerId ? item.model : null
      }))
    }),
    useCasesSaved: () => setSavedUseCases(serializeUseCases(useCases))
  };
}

function serializeUseCases(useCases: LlmUseCaseDraft[]): string {
  return JSON.stringify(useCases.map(item => [item.useCase, item.providerId, item.model]));
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
