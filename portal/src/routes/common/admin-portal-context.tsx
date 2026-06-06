import { createContext } from 'react';

export interface AdminPortalState {
  x: 1;
}

const adminPortalContext = createContext<AdminPortalState | null>(null);

export function AdminPortalContext(props: { children: React.ReactNode }) {
  return <adminPortalContext.Provider value={{ x: 1 }}>{props.children}</adminPortalContext.Provider>;
}
