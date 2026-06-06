import type { SubmitEvent } from 'react';

export interface InstallViewProps {
  rootUserName: string;
  rootPassword: string;
  error: string | null;
  onRootUserNameChange: (rootUserName: string) => void;
  onRootPasswordChange: (rootPassword: string) => void;
  onSubmit: (e: SubmitEvent) => void;
}

export function InstallView(props: InstallViewProps) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Install</h1>
        <p className="mt-1 text-xs text-slate-500">Create the root account to finish setting up the portal.</p>
      </div>

      <form onSubmit={props.onSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Root user name</span>
          <input
            name="rootUserName"
            type="text"
            value={props.rootUserName}
            onChange={e => props.onRootUserNameChange(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            placeholder="root"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Root password</span>
          <input
            name="rootPassword"
            type="password"
            value={props.rootPassword}
            onChange={e => props.onRootPasswordChange(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            placeholder="••••••••"
          />
        </label>

        {props.error && <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{props.error}</p>}

        <button
          type="submit"
          className="h-9 w-full rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Install
        </button>
      </form>
    </div>
  );
}
