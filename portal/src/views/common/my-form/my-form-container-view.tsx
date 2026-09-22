import type { ReactNode } from 'react';
import type { FormError } from '../../../routes/common/form-renderer/form-adapter';
import { SvgIcon } from '../svg-icons';

export interface MyFormContainerViewProps {
  children: ReactNode;
  formError: FormError | null;
  onFormErrorClose(): void;
}

export function MyFormContainerView(props: MyFormContainerViewProps) {
  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {props.children}
      {props.formError ? (
        <div className="absolute inset-x-0 top-0 z-10 px-3 pt-3" role="alert">
          <div className="mx-auto flex w-full max-w-3xl min-w-0 items-start gap-3 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-orange-950 shadow-lg">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Form unhandled error</p>
              <p className="mt-1 break-words text-sm">{props.formError.message}</p>
              {props.formError.stack ? (
                <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-orange-900">
                  {props.formError.stack}
                </pre>
              ) : null}
            </div>
            <button
              type="button"
              onClick={props.onFormErrorClose}
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded text-orange-700 transition-colors hover:bg-orange-200 hover:text-orange-950"
              aria-label="Close form error"
            >
              <SvgIcon name="x" className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
