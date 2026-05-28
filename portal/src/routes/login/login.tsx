import { useAuthContextState } from '../../auth/auth-context';
import { SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/api-client-context';
import { LoginResponse } from '@aila/model';

export function Login() {
  const authContext = useAuthContextState();
  const apiClient = useApiClient();
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

    authContext.setSession({
      userName,
      token: response.token
    });
    navigate('/');
  };

  return (
    <main>
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <label>
          UserName
          <input name="user" type="text" value={userName} onChange={e => setUserName(e.target.value)} />
        </label>
        <br />
        <label>
          Password
          <input name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <br />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
