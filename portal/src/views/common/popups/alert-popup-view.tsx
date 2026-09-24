import { useEffect, useId } from 'react';
import { SvgIcon } from '../svg-icons';

export type AlertPopupTheme = 'info' | 'warn';

export interface AlertPopupViewProps {
  theme: AlertPopupTheme;
  title: string;
  content: readonly string[];
  closeLabel: string;
  actionLabel: string;
  onClose(): void;
}

interface AlertPopupThemeClasses {
  popup: string;
  header: string;
  title: string;
  closeButton: string;
  content: string;
  actionButton: string;
}

const themeClasses: Record<AlertPopupTheme, AlertPopupThemeClasses> = {
  info: {
    popup: 'border-slate-200 bg-white',
    header: 'border-slate-200 bg-slate-50',
    title: 'text-slate-900',
    closeButton: 'text-slate-500 hover:bg-slate-200 hover:text-slate-900',
    content: 'text-slate-700',
    actionButton: 'bg-slate-700 hover:bg-slate-800'
  },
  warn: {
    popup: 'border-orange-300 bg-orange-50',
    header: 'border-orange-200 bg-orange-100',
    title: 'text-orange-950',
    closeButton: 'text-orange-700 hover:bg-orange-200 hover:text-orange-950',
    content: 'text-orange-950',
    actionButton: 'bg-orange-700 hover:bg-orange-800'
  }
};

export function AlertPopupView(props: AlertPopupViewProps) {
  const titleId = useId();
  const descriptionId = useId();
  const classes = themeClasses[props.theme];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-slate-900/40"
        onClick={props.onClose}
        aria-label={props.closeLabel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`relative w-full max-w-lg overflow-hidden rounded-lg border shadow-xl ${classes.popup}`}
      >
        <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${classes.header}`}>
          <div className="flex min-w-0 items-center gap-3">
            <h2 id={titleId} className={`text-lg font-semibold ${classes.title}`}>
              {props.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors ${classes.closeButton}`}
            aria-label={props.closeLabel}
          >
            <SvgIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4">
          <div id={descriptionId} className={`space-y-3 text-sm ${classes.content}`}>
            {props.content.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={props.onClose}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-white transition-colors ${classes.actionButton}`}
            >
              {props.actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
