import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { SvgIcon } from '../svg-icons';

export interface GenericPopupViewProps {
  title: string;
  titleIcon?: ReactNode;
  description?: string;
  closeLabel: string;
  children: ReactNode;
  onClose(): void;
}

export function GenericPopupView(props: GenericPopupViewProps) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-[30px]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-slate-900/40"
        onClick={props.onClose}
        aria-label={props.closeLabel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-xl sm:rounded-lg sm:border sm:border-slate-200 lg:max-w-5xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {props.titleIcon}
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold text-slate-900">
                {props.title}
              </h2>
              {props.description ? <p className="truncate text-sm text-slate-500">{props.description}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label={props.closeLabel}
          >
            <SvgIcon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1">{props.children}</div>
      </div>
    </div>
  );
}
