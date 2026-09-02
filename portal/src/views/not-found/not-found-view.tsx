export interface NotFoundViewProps {
  homeHref: string;
}

export function NotFoundView(props: NotFoundViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-slate-500 uppercase">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The page you requested does not exist.</p>
        <a
          className="mt-6 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          href={props.homeHref}
        >
          Go to dashboard
        </a>
      </section>
    </main>
  );
}
