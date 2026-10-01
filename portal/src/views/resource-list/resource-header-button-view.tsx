import type { ReactNode } from 'react';

export enum ResourceHeaderButtonTheme {
  PRIMARY = 1,
  SECONDARY = 2
}

export interface ResourceHeaderButtonViewProps {
  children: ReactNode;
  onClick(): void | Promise<void>;
  theme?: ResourceHeaderButtonTheme;
}

export function ResourceHeaderButtonView(props: ResourceHeaderButtonViewProps) {
  const theme = props.theme ?? ResourceHeaderButtonTheme.PRIMARY;
  const themeClassName =
    theme === ResourceHeaderButtonTheme.PRIMARY
      ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900';

  return (
    <button
      type="button"
      onClick={() => void props.onClick()}
      className={`cursor-pointer inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${themeClassName}`}
    >
      {props.children}
    </button>
  );
}
