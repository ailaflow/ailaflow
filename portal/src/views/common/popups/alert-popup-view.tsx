import { useId } from 'react';
import { GenericPopupView } from './generic-popup-view';

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
  contentContainer: string;
  content: string;
  actionButton: string;
}

const themeClasses: Record<AlertPopupTheme, AlertPopupThemeClasses> = {
  info: {
    contentContainer: 'bg-white',
    content: 'text-slate-700',
    actionButton: 'bg-slate-700 hover:bg-slate-800'
  },
  warn: {
    contentContainer: 'bg-orange-50',
    content: 'text-orange-950',
    actionButton: 'bg-orange-700 hover:bg-orange-800'
  }
};

export function AlertPopupView(props: AlertPopupViewProps) {
  const descriptionId = useId();
  const classes = themeClasses[props.theme];

  return (
    <GenericPopupView
      size="small"
      role="alertdialog"
      title={props.title}
      closeLabel={props.closeLabel}
      ariaDescribedBy={descriptionId}
      onClose={props.onClose}
    >
      <div className={`px-4 py-4 ${classes.contentContainer}`}>
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
    </GenericPopupView>
  );
}
