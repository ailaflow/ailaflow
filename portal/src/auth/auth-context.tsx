import { createContext, useContext, useEffect, useState } from 'react';
import { useApiClient } from './api-client-context';

const authContext = createContext<AuthContextState | null>(null);

export interface AuthSession {
  userName: string;
  token: string;
}

interface AuthContextState {
  session: AuthSession | null;
  setSession(session: AuthSession | null): void;
}

const localStorageKey = '__auth';

export function useAuthContextState(): AuthContextState {
  const context = useContext(authContext);
  if (!context) {
    throw new Error('Cannot find auth context');
  }
  return context;
}

export function useIsAuthenticated(): boolean {
  const context = useAuthContextState();
  return context.session !== null;
}

export function useSession(): AuthSession {
  const state = useAuthContextState();
  if (!state.session) {
    throw new Error('Not authenticated');
  }
  return state.session;
}

export interface AuthContextProps {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
}

export function AuthContext(props: AuthContextProps) {
  const apiClient = useApiClient();
  const [session, reactSetSession] = useState<AuthSession | null>(() =>
    props.initialSession === undefined ? tryReadStorage() : props.initialSession
  );
  apiClient.setAuthToken(session?.token ?? null);

  useEffect(() => {
    function handler() {
      setSession(null);
      apiClient.setAuthToken(null);
    }

    apiClient.setOnUnauthorizedListener(handler);
    return () => apiClient.setOnUnauthorizedListener(null);
  }, [apiClient]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const iv = setInterval(async () => {
      try {
        const abortSignal = AbortSignal.timeout(2_000);
        const response = await apiClient.auth.refreshToken(abortSignal, {
          token: session.token
        });
        session.token = response.token;
        updateStorage(session);
      } catch (e) {
        console.error(e);
      }
    }, 5_000);

    return () => clearInterval(iv);
  }, [session, apiClient]);

  function setSession(session: AuthSession | null) {
    apiClient.setAuthToken(session?.token ?? null);
    reactSetSession(session);
    updateStorage(session);
  }

  return <authContext.Provider value={{ session, setSession }}>{props.children}</authContext.Provider>;
}

function tryReadStorage(): AuthSession | null {
  const value = window.localStorage[localStorageKey];
  if (value) {
    return JSON.parse(value);
  } else {
    return null;
  }
}

function updateStorage(session: AuthSession | null) {
  if (session) {
    window.localStorage[localStorageKey] = JSON.stringify(session);
  } else {
    window.localStorage.removeItem(localStorageKey);
  }
}
