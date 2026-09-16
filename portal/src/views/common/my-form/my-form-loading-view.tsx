export function MyFormLoadingView() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label="Loading form">
      <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-slate-500" />
    </div>
  );
}
