import { useAuthState } from '../../auth/auth-context';
import { SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginResponse } from '@aila/model';
import { CenteredFormLayout } from '../../components/layouts/centered-form-layout';

export function Login() {
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
      userName,
      authToken: response.authToken,
      isAdmin: response.isAdmin
    });
    navigate('/');
  };

  return (
    <CenteredFormLayout>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-xs text-slate-500">Use your account credentials to access the portal.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">User name</span>
            <input
              name="user"
              type="text"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
              placeholder="your-user"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}

          <button
            type="submit"
            className="h-9 w-full rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </CenteredFormLayout>
  );
}
