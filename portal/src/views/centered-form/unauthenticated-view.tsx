import { Link } from 'react-router-dom';

export function UnauthenticatedView() {
  return (
    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5">
      <h1 className="text-lg font-semibold tracking-tight">Not authenticated</h1>
      <p className="mt-1 text-xs text-slate-500">You need to sign in to access the portal.</p>
      <div className="mt-4">
        <Link
          to="/login"
          className="inline-flex h-9 items-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}
