import { useEffect, useId } from 'react';
import { SvgIcon } from '../svg-icons';

export interface LicenseWarningPopupViewProps {
  error: string;
  onClose(): void;
}

export function LicenseWarningPopupView(props: LicenseWarningPopupViewProps) {
  const titleId = useId();
  const descriptionId = useId();

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
        aria-label="Close license warning"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-orange-300 bg-orange-50 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-orange-200 bg-orange-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <h2 id={titleId} className="text-lg font-semibold text-orange-950">
              License warning
            </h2>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-orange-700 transition-colors hover:bg-orange-200 hover:text-orange-950"
            aria-label="Close license warning"
          >
            <SvgIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4">
          <div id={descriptionId} className="space-y-3 text-sm text-orange-950">
            <p>This AilaFlow instance has a license validation issue: "{props.error}".</p>
            <p>Please contact your administrator to resolve the issue.</p>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={props.onClose}
              className="cursor-pointer rounded-md bg-orange-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-800"
            >
              Continue working
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
