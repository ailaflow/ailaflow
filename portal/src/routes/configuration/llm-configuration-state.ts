import {
  ALL_LLM_USE_CASES,
  LlmProviderConfigurationValidator,
  LlmProviderPolicy,
  LlmProviderType,
  LlmUseCaseConfigurationValidator,
  strLlmUseCase
} from '@ailaflow/shared';
import type {
  FetchLlmProviderModelsRequest,
  GetLlmConfigurationResponse,
  LlmModelDto,
  LlmProviderDto,
  SaveLlmProviderRequest,
  SaveLlmUseCaseAssignmentsRequest
} from '@ailaflow/shared';
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
  providerModelsFetched(models: LlmModelDto[]): void;
  toSaveProviderRequest(): SaveLlmProviderRequest;
  providerSaved(): void;
  providerDeleted(id: string): void;
  updateUseCase(
    useCase: LlmUseCaseDraft['useCase'],
    delta: Partial<Pick<LlmUseCaseDraft, 'providerId' | 'modelName' | 'modelContextWindow' | 'effectiveContextWindowPercent'>>
  ): void;
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
        modelName: saved?.modelName ?? '',
        modelContextWindow: saved?.modelContextWindow?.toString() ?? '',
        effectiveContextWindowPercent: (saved?.effectiveContextWindowPercent ?? 95).toString()
      };
    })
  );
  const [savedUseCases, setSavedUseCases] = useState(() => serializeUseCases(useCases));
  const [providerDraft, setProviderDraft] = useState<LlmProviderDraft | null>(null);

  const canSaveProvider = useMemo(() => {
    if (!providerDraft) {
      return false;
    }
    const data = prepareProviderData(providerDraft);
    return (
      LlmProviderConfigurationValidator.validateName(data.name) === null &&
      LlmProviderConfigurationValidator.validateConnection(data.type, data.url, data.apiKey, providerDraft.hasApiKey) === null &&
      data.models.length > 0 &&
      LlmProviderConfigurationValidator.validateModels(data.models) === null
    );
  }, [providerDraft]);

  const canFetchProviderModels = useMemo(() => {
    if (!providerDraft) {
      return false;
    }
    const data = prepareProviderData(providerDraft);
    return LlmProviderConfigurationValidator.validateConnection(data.type, data.url, data.apiKey, providerDraft.hasApiKey) === null;
  }, [providerDraft]);

  const canSaveUseCases = useMemo(() => {
    const isValid = useCases.every(item => {
      const modelContextWindow = readOptionalNumber(item.modelContextWindow);
      const effectiveContextWindowPercent = Number(item.effectiveContextWindowPercent);
      if (LlmUseCaseConfigurationValidator.validateModelContextWindow(modelContextWindow)) {
        return false;
      }
      if (LlmUseCaseConfigurationValidator.validateEffectiveContextWindowPercent(effectiveContextWindowPercent)) {
        return false;
      }
      if (!item.providerId && !item.modelName.trim()) {
        return true;
      }
      if (LlmUseCaseConfigurationValidator.validateProviderAndModel(item.providerId || null, item.modelName ? item.modelName : null)) {
        return false;
      }
      if (
        LlmUseCaseConfigurationValidator.validateProviderId(item.providerId) ||
        LlmUseCaseConfigurationValidator.validateModelName(item.modelName)
      ) {
        return false;
      }
      const provider = providers.find(candidate => candidate.id === item.providerId);
      return Boolean(provider?.models.some(model => model.name === item.modelName));
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
        url: '',
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
        url: provider.url ?? '',
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
      const data = prepareProviderData(providerDraft);
      return {
        id: providerDraft.insert ? undefined : providerDraft.id,
        type: data.type,
        url: data.url,
        apiKey: data.apiKey
      };
    },
    providerModelsFetched: models => setProviderDraft(current => (current ? { ...current, models: prepareModels(models) } : null)),
    toSaveProviderRequest: () => {
      if (!providerDraft) {
        throw new Error('No LLM provider is being edited');
      }
      const data = prepareProviderData(providerDraft);
      return {
        insert: providerDraft.insert,
        id: providerDraft.id,
        ...data
      };
    },
    providerSaved: () => {
      if (!providerDraft) {
        throw new Error('No LLM provider is being edited');
      }
      const data = prepareProviderData(providerDraft);
      const provider: LlmProviderDto = {
        id: providerDraft.id,
        name: data.name,
        type: data.type,
        url: data.url,
        hasApiKey: LlmProviderPolicy.requiresApiKey(data.type),
        models: data.models
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
        modelName: item.providerId ? item.modelName : null,
        modelContextWindow: item.providerId ? readOptionalNumber(item.modelContextWindow) : undefined,
        effectiveContextWindowPercent: Number(item.effectiveContextWindowPercent)
      }))
    }),
    useCasesSaved: () => setSavedUseCases(serializeUseCases(useCases))
  };
}

function serializeUseCases(useCases: LlmUseCaseDraft[]): string {
  return JSON.stringify(
    useCases.map(item => [item.useCase, item.providerId, item.modelName, item.modelContextWindow, item.effectiveContextWindowPercent])
  );
}

function readOptionalNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

function prepareProviderData(draft: LlmProviderDraft): Omit<SaveLlmProviderRequest, 'insert' | 'id'> {
  return {
    name: draft.name.trim(),
    type: draft.type,
    url: prepareUrl(draft.type, draft.url),
    apiKey: LlmProviderPolicy.requiresApiKey(draft.type) ? draft.apiKey.trim() || null : null,
    models: prepareModels(draft.models)
  };
}

function prepareUrl(type: LlmProviderType, value: string): string | null {
  if (!LlmProviderPolicy.requiresUrl(type)) {
    return null;
  }
  try {
    return new URL(value).toString().replace(/\/$/, '');
  } catch {
    return value;
  }
}

function prepareModels(models: LlmModelDto[]): LlmModelDto[] {
  const prepared = new Map<string, LlmModelDto>();
  for (const model of models) {
    const contextWindow = model.contextWindow ?? prepared.get(model.name)?.contextWindow;
    prepared.set(model.name, contextWindow === undefined ? { name: model.name } : { name: model.name, contextWindow });
  }
  return [...prepared.values()].sort((a, b) => a.name.localeCompare(b.name));
}
