import { useLoader } from '@aibindkit/react';
import { LicenseType } from '@aila/model';
import type { GetLicenseConfigurationResponse, GetLicenseStatusResponse, SaveLicenseConfigurationRequest } from '@aila/model';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { LicenseConfigurationView } from '../../views/configuration/license-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function LicenseConfigurationPage() {
  const apiClient = useApiClient();
  const loader = useLoader(
    async abortSignal => {
      const [configuration, status] = await Promise.all([
        apiClient.licenseConfiguration.get(abortSignal),
        apiClient.licenseConfiguration.getStatus(abortSignal)
      ]);
      return { configuration, status };
    },
    [apiClient]
  );

  if (loader.isLoading) return <PortalLoadingView />;
  if (loader.error) return <PortalErrorView error={loader.error} />;
  return <LoadedLicenseConfigurationPage initial={loader.data.configuration} initialStatus={loader.data.status} />;
}

function LoadedLicenseConfigurationPage(props: { initial: GetLicenseConfigurationResponse; initialStatus: GetLicenseStatusResponse }) {
  const apiClient = useApiClient();
  const [saved, setSaved] = useState(props.initial);
  const [status, setStatus] = useState(props.initialStatus.status);
  const [licenseType, setLicenseType] = useState(props.initial.type);
  const [licenseKey, setLicenseKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const draft: SaveLicenseConfigurationRequest = {
    type: licenseType,
    licenseKey: licenseType === LicenseType.HOME ? null : licenseKey.trim()
  };
  const isChanged = draft.type !== saved.type || Boolean(draft.licenseKey);
  const canSave = !isSaving && (draft.type === LicenseType.HOME || Boolean(draft.licenseKey)) && (isChanged || !status?.isValid);

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClient.licenseConfiguration.save(AbortSignal.timeout(10_000), draft);
      setSaved({ type: draft.type, hasLicenseKey: Boolean(draft.licenseKey) });
      setLicenseKey('');
      setSuccess(true);
      setStatus(null);
      try {
        const response = await apiClient.licenseConfiguration.getStatus(AbortSignal.timeout(10_000));
        setStatus(response.status);
      } catch {
        setError('License saved, but its status could not be refreshed. Reload the tab to try again.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <LicenseConfigurationView
      licenseType={licenseType}
      licenseKey={licenseKey}
      hasLicenseKey={saved.type === LicenseType.PRO && saved.hasLicenseKey}
      disabled={isSaving}
      canSave={canSave}
      error={error}
      success={success}
      status={status}
      checkedAt={status ? new Date(status.checkedAt).toLocaleString() : null}
      onLicenseTypeChange={type => {
        setLicenseType(type);
        if (type === LicenseType.HOME) setLicenseKey('');
        setError(null);
        setSuccess(false);
      }}
      onLicenseKeyChange={key => {
        setLicenseKey(key);
        setError(null);
        setSuccess(false);
      }}
      onSubmit={save}
    />
  );
}
