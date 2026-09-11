import type { SubmitEvent } from 'react';

export interface LoginViewProps {
  userName: string;
  password: string;
  canInstall: boolean;
  error: string | null;
  onInstall: () => void;
  onUserNameChange: (userName: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: SubmitEvent) => void;
}

export function LoginView(props: LoginViewProps) {
  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-xs text-slate-500">Use your account credentials to access the portal.</p>
      </div>

      {props.canInstall && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">
          <p className="text-sm font-semibold">Installation isn’t finished yet</p>
          <p className="mt-1 text-xs text-blue-800">Complete setup to start using AilaFlow.</p>
          <button
            type="button"
            onClick={props.onInstall}
            className="mt-3 h-8 cursor-pointer rounded-md bg-blue-700 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-800"
          >
            Install AilaFlow
          </button>
        </div>
      )}

      <form onSubmit={props.onSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">User name</span>
          <input
            name="user"
            type="text"
            value={props.userName}
            onChange={e => props.onUserNameChange(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            placeholder="your-user"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Password</span>
          <input
            name="password"
            type="password"
            value={props.password}
            onChange={e => props.onPasswordChange(e.target.value)}
            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
            placeholder="••••••••"
          />
        </label>

        {props.error && <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{props.error}</p>}

        <button
          type="submit"
          className="cursor-pointer h-9 w-full rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
