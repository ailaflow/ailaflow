import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthState } from '../../auth/auth-context';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';

export function MagicLinkPage() {
  const { apiClient, setSession } = useAuthState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const target = searchParams.get('t');
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

    if (!target) {
      setError('The magic-link target is missing.');
      return;
    }
    if (!token) {
      setError('The magic link is invalid or incomplete.');
      return;
    }

    const abortController = new AbortController();
    const signal = AbortSignal.any([abortController.signal, AbortSignal.timeout(10_000)]);
    void apiClient.auth
      .exchangeMagicLink(signal, { token })
      .then(response => {
        setSession({
          userName: response.userName,
          authToken: response.authToken,
          isAdmin: response.isAdmin
        });
        navigate(target, { replace: true });
      })
      .catch(exchangeError => {
        if (!abortController.signal.aborted) {
          setError(exchangeError instanceof Error ? exchangeError.message : String(exchangeError));
        }
      });

    return () => abortController.abort();
  }, [apiClient, navigate, searchParams, setSession]);

  return (
    <CenteredFormLayout>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-lg font-semibold tracking-tight">Opening secure link</h1>
        {error ? (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">Authenticating and opening your form…</p>
        )}
      </div>
    </CenteredFormLayout>
  );
}
