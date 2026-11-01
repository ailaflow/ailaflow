import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { UserValidator } from '@ailaflow/shared';
import type { InstallResponse } from '@ailaflow/shared';
import { useApiClient } from '../../auth/auth-context';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';
import { InstallView } from '../../views/install/install-view';

export function InstallPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [isPrivacyPolicyAccepted, setIsPrivacyPolicyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userNameError = UserValidator.validateName(userName);
  const passwordError = UserValidator.validatePassword(password);
  const canSubmit =
    !isSubmitting &&
    userNameError === null &&
    passwordError === null &&
    isPrivacyPolicyAccepted;
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
      const signal = AbortSignal.timeout(10000);
      response = await apiClient.install.install(signal, {
        rootUserName: userName,
        rootPassword: password
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
        isPrivacyPolicyAccepted={isPrivacyPolicyAccepted}
        error={error}
        disabled={isSubmitting}
        canSubmit={canSubmit}
        onUserNameChange={setUserName}
        onPasswordChange={setPassword}
        onPrivacyPolicyAcceptedChange={setIsPrivacyPolicyAccepted}
        onSubmit={onSubmit}
      />
    </CenteredFormLayout>
  );
}
