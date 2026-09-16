export interface FormMessageViewProps {
  title: string;
  children: React.ReactNode;
  lockedClickLabel?: string;
  onLockedClick?(): void;
}

export function FormMessageView(props: FormMessageViewProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (props.onLockedClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      props.onLockedClick();
    }
  }

  return (
    <div className="mt-2 flex justify-start">
      <article
        className={`max-w-[88%] rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-slate-800 shadow-sm ${
          props.onLockedClick ? 'cursor-pointer' : ''
        }`}
        role={props.onLockedClick ? 'button' : undefined}
        tabIndex={props.onLockedClick ? 0 : undefined}
        aria-label={props.onLockedClick ? (props.lockedClickLabel ?? `Open ${props.title}`) : undefined}
        onClick={props.onLockedClick}
        onKeyDown={handleKeyDown}
      >
        <div className={props.onLockedClick ? 'pointer-events-none' : undefined} inert={props.onLockedClick ? true : undefined}>
          <div className="mb-1 text-[11px] font-semibold uppercase leading-tight text-orange-700">{props.title}</div>
          <div className="overflow-hidden">{props.children}</div>
        </div>
      </article>
    </div>
  );
}
