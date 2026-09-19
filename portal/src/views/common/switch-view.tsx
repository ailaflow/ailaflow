export interface SwitchViewProps {
  label: string;
  value: boolean;
  onChange(value: boolean): void;
}

export function SwitchView(props: SwitchViewProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={props.label}
      aria-checked={props.value}
      onClick={() => props.onChange(!props.value)}
      className="cursor-pointer inline-flex h-9 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
    >
      <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${props.value ? 'bg-slate-900' : 'bg-slate-300'}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${props.value ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
      <span>{props.value ? 'True' : 'False'}</span>
    </button>
  );
}
