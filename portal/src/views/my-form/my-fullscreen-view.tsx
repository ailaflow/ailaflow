import type { ReactNode } from 'react';

export interface MyFullscreenViewProps {
  children: ReactNode;
}

export function MyFullscreenView(props: MyFullscreenViewProps) {
  return <div className="h-screen w-screen overflow-hidden">{props.children}</div>;
}
