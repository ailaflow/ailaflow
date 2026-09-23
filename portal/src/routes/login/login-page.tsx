import { useAuthState } from '../../auth/auth-context';
import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { LoginResponse } from '@ailaflow/shared';
import { LoginView } from '../../views/centered-form/login-view';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';

export function LoginPage() {
  const { apiClient, setSession } = useAuthState();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [canInstall, setCanInstall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkCanInstall() {
      const signal = AbortSignal.timeout(3_000);
      const response = await apiClient.install.canInstall(signal);
      setCanInstall(response.canInstall);
    }
    void checkCanInstall();
  }, [apiClient]);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    let response: LoginResponse;
    try {
      const signal = AbortSignal.timeout(10000);
      response = await apiClient.auth.login(signal, {
        userName,
        password
      });
    } catch (e) {
      setError((e as Error).message ?? String(e));
      return;
    }

    setSession({
      userName: response.userName,
      authToken: response.authToken,
      isAdmin: response.isAdmin
    });
    navigate('/');
  };

  return (
    <CenteredFormLayout>
      <LoginView
        userName={userName}
        password={password}
        canInstall={canInstall}
        error={error}
        onInstall={() => navigate('/install')}
        onUserNameChange={setUserName}
        onPasswordChange={setPassword}
        onSubmit={onSubmit}
      />
    </CenteredFormLayout>
  );
}
