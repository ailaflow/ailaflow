import { SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallResponse } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';

export function Install() {
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
    <main>
      <h1>Install</h1>
      <form onSubmit={onSubmit}>
        <label>
          Root user name
          <input name="rootUserName" type="text" value={rootUserName} onChange={e => setRootUserName(e.target.value)} />
        </label>
        <br />
        <label>
          Root password
          <input name="rootPassword" type="password" value={rootPassword} onChange={e => setRootPassword(e.target.value)} />
        </label>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <br />
        <button type="submit">Install</button>
      </form>
    </main>
  );
}
