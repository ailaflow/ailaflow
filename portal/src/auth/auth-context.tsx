import { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient } from './api-client';

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
    if (!session) {
      return;
    }
    const iv = setInterval(async () => {
      try {
        const abortSignal = AbortSignal.timeout(3_000);
        const response = await apiClient.auth.refreshToken(abortSignal, {
          authToken: session.authToken
        });
        session.authToken = response.authToken;
        apiClient.updateAuthToken(response.authToken);
        saveToStorage(session);
      } catch (e) {
        console.error(e);
      }
    }, 10_000);

    return () => clearInterval(iv);
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
