import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallResponse } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';
import { InstallView } from '../../views/centered-form/install-view';

export function InstallPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [rootUserName, setRootUserName] = useState('');
  const [rootPassword, setRootPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);

    let response: InstallResponse;
    try {
      const abortSignal = AbortSignal.timeout(10000);
      response = await apiClient.install.install(abortSignal, {
        rootUserName,
        rootPassword
      });
    } catch (e) {
      setError((e as Error).message ?? String(e));
      return;
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
        onRootUserNameChange={setRootUserName}
        onRootPasswordChange={setRootPassword}
        onSubmit={onSubmit}
      />
    </CenteredFormLayout>
  );
}
