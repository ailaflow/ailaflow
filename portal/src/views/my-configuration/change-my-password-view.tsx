import type { SubmitEvent } from 'react';

export interface ChangeMyPasswordViewProps {
  currentPassword: string;
  newPassword: string;
  confirmedPassword: string;
  newPasswordError: string | null;
  confirmedPasswordError: string | null;
  canSubmit: boolean;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
  onCurrentPasswordChange(password: string): void;
  onNewPasswordChange(password: string): void;
  onConfirmedPasswordChange(password: string): void;
  onSubmit(event: SubmitEvent): void | Promise<void>;
}

export function ChangeMyPasswordView(props: ChangeMyPasswordViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <section className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your current password and choose a new one.</p>
        </div>
        <form onSubmit={props.onSubmit} className="space-y-4 p-4 sm:p-5">
          <PasswordInput
            label="Current password"
            name="currentPassword"
            autoComplete="current-password"
            value={props.currentPassword}
            disabled={props.isSubmitting}
            error={null}
            onChange={props.onCurrentPasswordChange}
          />
          <PasswordInput
            label="New password"
            name="newPassword"
            autoComplete="new-password"
            value={props.newPassword}
            disabled={props.isSubmitting}
            error={props.newPasswordError}
            onChange={props.onNewPasswordChange}
          />
          <PasswordInput
            label="Confirm new password"
            name="confirmedPassword"
            autoComplete="new-password"
            value={props.confirmedPassword}
            disabled={props.isSubmitting}
            error={props.confirmedPasswordError}
            onChange={props.onConfirmedPasswordChange}
          />

          {props.error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {props.error}
            </p>
          ) : null}
          {props.success ? (
            <p role="status" className="text-sm text-emerald-700">
              Password changed.
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!props.canSubmit}
              className="h-9 w-full cursor-pointer rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {props.isSubmitting ? 'Changing password…' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

interface PasswordInputProps {
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  disabled: boolean;
  error: string | null;
  onChange(value: string): void;
}

function PasswordInput(props: PasswordInputProps) {
  return (
    <label className="block max-w-sm">
      <span className="mb-1 block text-sm font-medium text-slate-700">{props.label}</span>
      <input
        type="password"
        name={props.name}
        autoComplete={props.autoComplete}
        value={props.value}
        disabled={props.disabled}
        onChange={event => props.onChange(event.target.value)}
        aria-invalid={props.error !== null}
        className={`h-9 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:border-slate-500 ${
          props.error ? 'border-red-300 bg-red-50/30' : 'border-slate-300 bg-white'
        }`}
      />
      {props.error ? <span className="mt-1 block text-sm text-red-700">{props.error}</span> : null}
    </label>
  );
}
