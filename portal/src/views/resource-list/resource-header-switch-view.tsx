export interface ResourceHeaderSwitchOption<T extends string> {
  value: T;
  label: string;
}

export interface ResourceHeaderSwitchViewProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: ResourceHeaderSwitchOption<T>[];
  onChange(value: T): void;
}

export function ResourceHeaderSwitchView<T extends string>(props: ResourceHeaderSwitchViewProps<T>) {
  return (
    <div role="group" aria-label={props.ariaLabel} className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
      {props.options.map(option => {
        const selected = option.value === props.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => props.onChange(option.value)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
