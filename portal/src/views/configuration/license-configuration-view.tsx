import { LicenseType } from '@ailaflow/shared';
import type { LicenseStatus } from '@ailaflow/shared';
import type { SubmitEvent } from 'react';
import { LicenseSelectorView } from '../common/license-selector-view';
import type { LicenseSelectorViewProps } from '../common/license-selector-view';

export interface LicenseConfigurationViewProps extends LicenseSelectorViewProps {
  canSave: boolean;
  error: string | null;
  success: boolean;
  status: LicenseStatus | null;
  checkedAt: string | null;
  onSubmit(event: SubmitEvent): void | Promise<void>;
}

export function LicenseConfigurationView(props: LicenseConfigurationViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900">License</h2>
            <p className="mt-1 text-sm text-slate-500">Choose the license for your use of AilaFlow.</p>
          </div>
          <form onSubmit={props.onSubmit} className="space-y-4 p-4">
            <LicenseSelectorView {...props} />
            {props.error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {props.error}
              </p>
            )}
            {props.success && (
              <p role="status" className="text-sm text-emerald-700">
                License saved.
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!props.canSave}
                className="cursor-pointer h-9 w-full rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
              >
                {props.disabled ? 'Validating and saving…' : 'Save license'}
              </button>
            </div>
          </form>
        </section>
        <section className="min-w-0 self-start rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Saved license status">
          <h2 className="text-lg font-semibold text-slate-900">License status</h2>
          {props.status ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Saved license</dt>
                <dd>
                  {props.status.type === LicenseType.HOME ? 'Home' : props.status.type === LicenseType.STARTER ? 'Starter' : 'Business'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Validation</dt>
                <dd className={props.status.isValid ? 'text-emerald-700' : 'text-red-700'}>
                  {props.status.isValid ? 'Valid' : 'Invalid or unavailable'}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-slate-500">Last checked</dt>
                <dd>{props.checkedAt}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Proof</dt>
                <dd className="mt-1 break-all font-mono text-xs">{props.status.proof || 'Not available'}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">License status data is not available yet.</p>
          )}
          <p className="mt-4 text-xs text-slate-500">Status is checked at server startup and every 12 hours.</p>
        </section>
      </div>
    </div>
  );
}
