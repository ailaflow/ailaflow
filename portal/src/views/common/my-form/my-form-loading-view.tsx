interface MyFormLoadingViewProps {
  progressLabel: string | null;
}

export function MyFormLoadingView(props: MyFormLoadingViewProps) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3"
      role="status"
      aria-label={props.progressLabel ?? 'Loading form'}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-slate-500" />
      {props.progressLabel ? <p className="text-center text-sm text-slate-500">{props.progressLabel}</p> : null}
    </div>
  );
}
