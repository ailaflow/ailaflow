import { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient } from '../api/api-client';

const authContext = createContext<AuthState | null>(null);

export interface AuthSession {
  userName: string;
  authToken: string;
  isAdmin: boolean;
}

interface AuthState {
  apiClient: ApiClient;
  session: AuthSession | null;
  setSession(session: AuthSession | null): void;
}

export function useAuthState(): AuthState {
  const context = useContext(authContext);
  if (!context) {
    throw new Error('Cannot find auth context');
  }
  return context;
}

export function useIsAuthenticated(): boolean {
  const context = useAuthState();
  return context.session !== null;
}

export function useSession(): AuthSession {
  const state = useAuthState();
  if (!state.session) {
    throw new Error('Not authenticated');
  }
  return state.session;
}

export function useApiClient(): ApiClient {
  const state = useAuthState();
  return state.apiClient;
}

export interface AuthContextProps {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
}

export function AuthContext(props: AuthContextProps) {
  const [{ apiClient, session }, setState] = useState(() => {
    const session = props.initialSession === undefined ? tryReadStorage() : props.initialSession;
    const apiClient = new ApiClient(session?.authToken ?? null);
    return {
      apiClient,
      session
    };
  });

  useEffect(() => {
    const listener = () => setSession(null);
    apiClient.onUnauthorized.subscribe(listener);
    return () => apiClient.onUnauthorized.unsubscribe(listener);
  }, [apiClient]);

  useEffect(() => {
    const abortController = new AbortController();
    let to: ReturnType<typeof setTimeout> | null = null;

    async function refresh(s: AuthSession) {
      to = null;
      if (abortController.signal.aborted) {
        return;
      }
      try {
        const signal = AbortSignal.any([AbortSignal.timeout(3_000), abortController.signal]);
        const response = await apiClient.auth.refreshToken(signal, {
          authToken: s.authToken
        });
        if (!abortController.signal.aborted) {
          s.authToken = response.authToken;
          apiClient.updateAuthToken(response.authToken);
          saveToStorage(session);
        }
      } catch (e) {
        console.error(`Failed to refresh auth token: ${(e as Error)?.message ?? e}`);
      }
      if (!abortController.signal.aborted) {
        to = setTimeout(() => refresh(s), 60_000);
      }
    }

    if (session) {
      refresh(session);
      return () => {
        abortController.abort();
        if (to) {
          clearTimeout(to);
        }
      };
    }
  }, [session, apiClient]);

  function setSession(session: AuthSession | null) {
    setState({
      apiClient: new ApiClient(session?.authToken ?? null),
      session
    });
    saveToStorage(session);
  }

  return <authContext.Provider value={{ apiClient, session, setSession }}>{props.children}</authContext.Provider>;
}

const localStorageKey = '__auth';

function tryReadStorage(): AuthSession | null {
  const value = window.localStorage[localStorageKey];
  if (value) {
    return JSON.parse(value);
  } else {
    return null;
  }
}

function saveToStorage(session: AuthSession | null) {
  if (session) {
    window.localStorage[localStorageKey] = JSON.stringify(session);
  } else {
    window.localStorage.removeItem(localStorageKey);
  }
}
