import { createContext, useContext } from 'react';
import { ApiClient } from './api-client';

const apiClientContext = createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const client = useContext(apiClientContext);
  if (!client) {
    throw new Error('Cannot find server client context');
  }
  return client;
}

export function ApiClientContext(props: { children: React.ReactNode }) {
  return <apiClientContext.Provider value={new ApiClient()}>{props.children}</apiClientContext.Provider>;
}
