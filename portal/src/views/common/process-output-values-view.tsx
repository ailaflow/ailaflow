export interface ProcessOutputValuesViewProps {
  outputValues: Record<string, unknown>;
}

export function ProcessOutputValuesView(props: ProcessOutputValuesViewProps) {
  return (
    <dl className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
      {Object.entries(props.outputValues).map(([name, value]) => (
        <div key={name} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(7rem,0.35fr)_minmax(0,1fr)] sm:gap-4">
          <dt className="text-xs font-medium text-slate-500">${name}</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words font-mono text-xs text-slate-800">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  const json = JSON.stringify(value, null, 2);
  return json ?? String(value);
}
