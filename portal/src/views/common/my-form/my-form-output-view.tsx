import { ProcessOutputValuesView } from '../process-output-values-view';

export function MyFormOutputView({ outputValues }: { outputValues: Record<string, unknown> }) {
  const entries = Object.entries(outputValues);

  return (
    <div className="h-full overflow-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs text-slate-500">
          {entries.length === 0 ? 'Process finished.' : 'Process finished and returned the following output variables.'}
        </p>
        {entries.length > 0 ? <ProcessOutputValuesView outputValues={outputValues} /> : null}
      </div>
    </div>
  );
}
