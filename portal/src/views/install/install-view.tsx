import { LicenseSelectorView } from '../common/license-selector-view';
import type { LicenseSelectorViewProps } from '../common/license-selector-view';
import type { SubmitEvent } from 'react';

export interface InstallViewProps extends LicenseSelectorViewProps {
  canSubmit: boolean;
  userName: string;
  userNameError: string | null;
  password: string;
  passwordError: string | null;
  isPolicyAccepted: boolean;
  error: string | null;
  onUserNameChange: (userName: string) => void;
  onPasswordChange: (password: string) => void;
  onPolicyAcceptedChange: (isAccepted: boolean) => void;
  onSubmit: (e: SubmitEvent) => void;
}

export function InstallView(props: InstallViewProps) {
  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Install</h1>
        <p className="mt-1 text-xs text-slate-500">Create the admin account and choose a license to finish setup.</p>
      </div>

      <form onSubmit={props.onSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Admin user name</span>
          <input
            disabled={props.disabled}
            name="userName"
            type="text"
            value={props.userName}
            onChange={e => props.onUserNameChange(e.target.value)}
            aria-invalid={props.userNameError !== null}
            className={`h-9 w-full rounded-md border px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 ${
              props.userNameError ? 'border-red-300 bg-red-50/30' : 'border-slate-300 bg-white'
            }`}
            placeholder="admin"
          />
          {props.userNameError ? <span className="block text-xs text-red-700">{props.userNameError}</span> : null}
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Admin password</span>
          <input
            disabled={props.disabled}
            name="password"
            type="password"
            value={props.password}
            onChange={e => props.onPasswordChange(e.target.value)}
            aria-invalid={props.passwordError !== null}
            className={`h-9 w-full rounded-md border px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 ${
              props.passwordError ? 'border-red-300 bg-red-50/30' : 'border-slate-300 bg-white'
            }`}
            placeholder="••••••••"
          />
          {props.passwordError ? <span className="block text-xs text-red-700">{props.passwordError}</span> : null}
        </label>

        <LicenseSelectorView {...props} />

        <div className="flex items-start gap-2 text-xs text-slate-700">
          <input
            id="install-policy-acceptance"
            type="checkbox"
            checked={props.isPolicyAccepted}
            disabled={props.disabled}
            onChange={e => props.onPolicyAcceptedChange(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-300"
          />
          <label htmlFor="install-policy-acceptance">
            I accept the{' '}
            <a
              href="https://ailaflow.com/license/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
            >
              license
            </a>{' '}
            and{' '}
            <a
              href="https://ailaflow.com/privacy-policy/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-900"
            >
              privacy policy
            </a>
            .
          </label>
        </div>

        {props.error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {props.error}
          </p>
        )}

        <button
          type="submit"
          disabled={!props.canSubmit}
          className="cursor-pointer h-9 w-full rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
        >
          {props.disabled ? 'Validating and installing…' : 'Install'}
        </button>
      </form>
    </div>
  );
}
