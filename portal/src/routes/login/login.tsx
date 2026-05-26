import { useAuthContextState } from '../../auth/auth-context';
import { SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/api-client-context';

export function Login() {
  const authContext = useAuthContextState();
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();

    const result = await apiClient.auth.login({
      userName,
      password
    });
    if (!result.token) {
      setError('Invalid user or password');
      return;
    }

    authContext.setSession({
      user: userName,
      token: result.token
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
          <input name="password" type="text" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <br />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
