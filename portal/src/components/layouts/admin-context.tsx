import { createContext } from 'react';

export interface AdminState {
  x: 1;
}

const adminContext = createContext<AdminState | null>(null);

export function AdminContext(props: { children: React.ReactNode }) {
  return <adminContext.Provider value={{ x: 1 }}>{props.children}</adminContext.Provider>;
}
