import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallResponse, LicenseType } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';
import { InstallView } from '../../views/install/install-view';

export function InstallPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [rootUserName, setRootUserName] = useState('');
  const [rootPassword, setRootPassword] = useState('');
  const [licenseType, setLicenseType] = useState(LicenseType.HOME);
  const [licenseKey, setLicenseKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = !isSubmitting && (licenseType === LicenseType.HOME || Boolean(licenseKey.trim()));
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setIsSubmitting(true);

    let response: InstallResponse;
    try {
      const abortSignal = AbortSignal.timeout(10000);
      response = await apiClient.install.install(abortSignal, {
        rootUserName,
        rootPassword,
        licenseType,
        licenseKey: licenseKey.trim() || null
      });
    } catch (e) {
      setError((e as Error).message ?? String(e));
      return;
    } finally {
      setIsSubmitting(false);
    }

    if (response.error) {
      setError(response.error);
      return;
    }

    navigate('/login');
  };

  return (
    <CenteredFormLayout>
      <InstallView
        rootUserName={rootUserName}
        rootPassword={rootPassword}
        error={error}
        licenseType={licenseType}
        licenseKey={licenseKey}
        disabled={isSubmitting}
        canSubmit={canSubmit}
        onLicenseTypeChange={type => {
          setLicenseType(type);
          setError(null);
          if (type === LicenseType.HOME) {
            setLicenseKey('');
          }
        }}
        onLicenseKeyChange={key => {
          setLicenseKey(key);
          setError(null);
        }}
        onRootUserNameChange={setRootUserName}
        onRootPasswordChange={setRootPassword}
        onSubmit={onSubmit}
      />
    </CenteredFormLayout>
  );
}
