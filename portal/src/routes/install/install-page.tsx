import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LicenseType, UserValidator } from '@ailaflow/shared';
import type { InstallResponse } from '@ailaflow/shared';
import { useApiClient } from '../../auth/auth-context';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';
import { InstallView } from '../../views/install/install-view';

export function InstallPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [licenseType, setLicenseType] = useState(LicenseType.HOME);
  const [licenseKey, setLicenseKey] = useState('');
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userNameError = UserValidator.validateName(userName);
  const passwordError = UserValidator.validatePassword(password);
  const canSubmit =
    !isSubmitting &&
    userNameError === null &&
    passwordError === null &&
    isPolicyAccepted &&
    (licenseType !== LicenseType.BUSINESS || Boolean(licenseKey.trim()));
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setError(null);
    setIsSubmitting(true);

    let response: InstallResponse;
    try {
      const abortSignal = AbortSignal.timeout(10000);
      response = await apiClient.install.install(abortSignal, {
        rootUserName: userName,
        rootPassword: password,
        licenseType,
        licenseKey: licenseType === LicenseType.BUSINESS ? licenseKey.trim() : null
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
        userName={userName}
        userNameError={userNameError}
        password={password}
        passwordError={passwordError}
        isPolicyAccepted={isPolicyAccepted}
        error={error}
        licenseType={licenseType}
        licenseKey={licenseKey}
        disabled={isSubmitting}
        canSubmit={canSubmit}
        onLicenseTypeChange={type => {
          setLicenseType(type);
          setError(null);
          if (type !== LicenseType.BUSINESS) {
            setLicenseKey('');
          }
        }}
        onLicenseKeyChange={key => {
          setLicenseKey(key);
          setError(null);
        }}
        onUserNameChange={setUserName}
        onPasswordChange={setPassword}
        onPolicyAcceptedChange={setIsPolicyAccepted}
        onSubmit={onSubmit}
      />
    </CenteredFormLayout>
  );
}
