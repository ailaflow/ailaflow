import type { TestPublicUrlResponse } from '@ailaflow/shared';

export interface PublicUrlConfigurationViewProps {
  publicUrl: string;
  validationError: string | null;
  testResult: TestPublicUrlResponse | null;
  canSave: boolean;
  canTest: boolean;
  isSaving: boolean;
  isTesting: boolean;
  onPublicUrlChange(value: string): void;
  onSave(): void | Promise<void>;
  onTest(): void | Promise<void>;
}

export function PublicUrlConfigurationView(props: PublicUrlConfigurationViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Public server URL</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure the externally accessible address used when AilaFlow generates public links.
            </p>
          </div>

          <div className="p-4">
            <label className="block text-sm font-medium text-slate-700">
              Public URL
              <input
                type="url"
                value={props.publicUrl}
                onChange={event => props.onPublicUrlChange(event.target.value)}
                placeholder="https://my-domain.com/ailaflow"
                aria-invalid={Boolean(props.validationError)}
                className={`mt-1.5 h-9 w-full rounded-md border bg-white px-2.5 font-mono text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 ${
                  props.validationError ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
                }`}
              />
            </label>
            <p className={`mt-1.5 text-xs ${props.validationError ? 'text-red-700' : 'text-slate-500'}`}>
              {props.validationError ??
                'Paths are supported for reverse proxies. The connection test requests <Public URL>/health; clear the field and save to remove it.'}
            </p>

            {props.testResult ? (
              <div
                className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                  props.testResult.isAvailable
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-orange-300 bg-orange-50 text-orange-900'
                }`}
              >
                {props.testResult.isAvailable ? 'Public URL is available.' : props.testResult.error}
              </div>
            ) : null}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={!props.canTest}
                onClick={() => void props.onTest()}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                {props.isTesting ? 'Testing…' : 'Test connection'}
              </button>
              <button
                type="button"
                disabled={!props.canSave}
                onClick={() => void props.onSave()}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
              >
                {props.isSaving ? 'Saving…' : 'Save Public URL'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
