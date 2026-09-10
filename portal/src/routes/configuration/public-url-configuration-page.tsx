import { useLoader } from '@aibindkit/react';
import { PublicUrlValidator } from '@ailaflow/shared';
import type { GetPublicUrlConfigurationResponse, TestPublicUrlResponse } from '@ailaflow/shared';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { PublicUrlConfigurationView } from '../../views/configuration/public-url-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function PublicUrlConfigurationPage() {
  const apiClient = useApiClient();
  const loader = useLoader(abortSignal => apiClient.publicUrlConfiguration.get(abortSignal), [apiClient]);

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <LoadedPublicUrlConfigurationPage initial={loader.data} />;
}

function LoadedPublicUrlConfigurationPage(props: { initial: GetPublicUrlConfigurationResponse }) {
  const apiClient = useApiClient();
  const [savedPublicUrl, setSavedPublicUrl] = useState(props.initial.publicUrl);
  const [draft, setDraft] = useState(props.initial.publicUrl ?? '');
  const [testResult, setTestResult] = useState<TestPublicUrlResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const trimmedDraft = draft.trim();
  const validationError = trimmedDraft ? PublicUrlValidator.validate(trimmedDraft) : null;
  const canSave = validationError === null && trimmedDraft !== (savedPublicUrl ?? '') && !isSaving && !isTesting;
  const canTest = Boolean(trimmedDraft) && validationError === null && !isSaving && !isTesting;

  async function save(): Promise<void> {
    setIsSaving(true);
    try {
      const response = await apiClient.publicUrlConfiguration.save(AbortSignal.timeout(10_000), {
        publicUrl: trimmedDraft || null
      });
      setSavedPublicUrl(response.publicUrl);
      setDraft(response.publicUrl ?? '');
      setTestResult(null);
    } catch (error) {
      window.alert(`Failed to save Public URL: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function test(): Promise<void> {
    if (!trimmedDraft) {
      return;
    }
    setIsTesting(true);
    try {
      setTestResult(
        await apiClient.publicUrlConfiguration.test(AbortSignal.timeout(10_000), {
          publicUrl: trimmedDraft
        })
      );
    } catch (error) {
      window.alert(`Failed to test Public URL: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <PublicUrlConfigurationView
      publicUrl={draft}
      validationError={validationError}
      testResult={testResult}
      canSave={canSave}
      canTest={canTest}
      isSaving={isSaving}
      isTesting={isTesting}
      onPublicUrlChange={value => {
        setDraft(value);
        setTestResult(null);
      }}
      onSave={save}
      onTest={test}
    />
  );
}
