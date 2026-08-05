import type { ReactNode } from 'react';

export interface ResourceIconProps {
  children: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS_NAMES = {
  sm: 'h-4 w-4 border-slate-300 text-[10px]',
  md: 'h-6 w-6 border-slate-200 bg-slate-50 text-xs'
} as const;

export function ResourceIcon(props: ResourceIconProps) {
  const size = props.size ?? 'sm';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded border font-semibold text-slate-600 ${SIZE_CLASS_NAMES[size]} ${props.className ?? ''}`}
    >
      {props.children}
    </span>
  );
}
