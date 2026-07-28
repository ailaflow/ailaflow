import { useAuthState } from '../../auth/auth-context';
import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginResponse } from '@aila/model';
import { LoginView } from '../../views/centered-form/login-view';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';

export function LoginPage() {
  const { apiClient, setSession } = useAuthState();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    let response: LoginResponse;
    try {
      const abortSignal = AbortSignal.timeout(10000);
      response = await apiClient.auth.login(abortSignal, {
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
        error={error}
        onUserNameChange={setUserName}
        onPasswordChange={setPassword}
        onSubmit={onSubmit}
      />
    </CenteredFormLayout>
  );
}
