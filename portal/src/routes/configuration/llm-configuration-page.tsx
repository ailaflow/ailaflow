import { useLoader } from '@aibindkit/react';
import type { GetLlmConfigurationResponse, LlmProviderDto } from '@ailaflow/model';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { LlmConfigurationView } from '../../views/configuration/llm-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { useLlmConfigurationState } from './llm-configuration-state';

export function LlmConfigurationPage() {
  const apiClient = useApiClient();
  const loader = useLoader(abortSignal => apiClient.llmConfiguration.get(abortSignal), [apiClient]);

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <LoadedLlmConfigurationPage initial={loader.data} />;
}

function LoadedLlmConfigurationPage(props: { initial: GetLlmConfigurationResponse }) {
  const apiClient = useApiClient();
  const state = useLlmConfigurationState(props.initial);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isFetchingProviderModels, setIsFetchingProviderModels] = useState(false);
  const [isSavingUseCases, setIsSavingUseCases] = useState(false);

  async function fetchProviderModels(): Promise<void> {
    setIsFetchingProviderModels(true);
    try {
      const response = await apiClient.llmConfiguration.fetchProviderModels(
        AbortSignal.timeout(20_000),
        state.toFetchProviderModelsRequest()
      );
      state.providerModelsFetched(response.models);
    } catch (error) {
      alert(`Failed to fetch LLM models: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsFetchingProviderModels(false);
    }
  }

  async function saveProvider(): Promise<void> {
    setIsSavingProvider(true);
    try {
      await apiClient.llmConfiguration.saveProvider(AbortSignal.timeout(10_000), state.toSaveProviderRequest());
      state.providerSaved();
    } catch (error) {
      alert(`Failed to save LLM provider: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSavingProvider(false);
    }
  }

  async function deleteProvider(provider: LlmProviderDto): Promise<void> {
    if (!window.confirm(`Delete LLM provider "${provider.name}"?`)) {
      return;
    }
    try {
      await apiClient.llmConfiguration.deleteProvider(AbortSignal.timeout(10_000), provider.id);
      state.providerDeleted(provider.id);
    } catch (error) {
      alert(`Failed to delete LLM provider: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function saveUseCases(): Promise<void> {
    setIsSavingUseCases(true);
    try {
      await apiClient.llmConfiguration.saveUseCaseAssignments(AbortSignal.timeout(10_000), state.toSaveUseCasesRequest());
      state.useCasesSaved();
    } catch (error) {
      alert(`Failed to save LLM use cases: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSavingUseCases(false);
    }
  }

  return (
    <LlmConfigurationView
      providers={state.providers}
      useCases={state.useCases}
      providerDraft={state.providerDraft}
      canFetchProviderModels={state.canFetchProviderModels && !isFetchingProviderModels && !isSavingProvider}
      canSaveProvider={state.canSaveProvider && !isSavingProvider && !isFetchingProviderModels}
      canSaveUseCases={state.canSaveUseCases && !isSavingUseCases}
      isSavingProvider={isSavingProvider}
      isFetchingProviderModels={isFetchingProviderModels}
      isSavingUseCases={isSavingUseCases}
      onProviderAdd={state.startProviderCreation}
      onProviderEdit={state.startProviderEdit}
      onProviderDelete={deleteProvider}
      onProviderDraftChange={state.updateProviderDraft}
      onProviderModelsFetch={fetchProviderModels}
      onProviderEditCancel={state.cancelProviderEdit}
      onProviderSave={saveProvider}
      onUseCaseChange={state.updateUseCase}
      onUseCasesSave={saveUseCases}
    />
  );
}
