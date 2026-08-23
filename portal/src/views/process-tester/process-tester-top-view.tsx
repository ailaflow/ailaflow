import type { ProcessExecutionVariableValues, TestProcessUpdate } from '@aila/model';

export function ProcessTesterTopView(props: { children: React.ReactNode }) {
  return (
    <section className="min-h-0 overflow-hidden" aria-label="Process test">
      {props.children}
    </section>
  );
}

export function ProcessTesterErrorView(props: { error: string }) {
  return <div className="h-full overflow-auto p-4 text-red-700">{props.error}</div>;
}

export function ProcessTesterUpdatesView(props: { updates: TestProcessUpdate[]; resultError?: string }) {
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-xl font-semibold text-slate-900">Process Updates</h2>
      <ul className="mt-3 space-y-3">
        {props.updates.map((update, index) => (
          <li key={index}>
            <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(update, null, 2)}</pre>
          </li>
        ))}
      </ul>
      {props.resultError && (
        <div className="mt-4 text-red-700">
          <h3 className="font-semibold">Process Error</h3>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm">{props.resultError}</pre>
        </div>
      )}
    </div>
  );
}

export function ProcessTesterOutputView(props: { output: ProcessExecutionVariableValues }) {
  return (
    <div className="h-full overflow-auto p-4">
      <h2 className="text-xl font-semibold text-slate-900">Process Finished</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {Object.entries(props.output).map(([name, value]) => (
          <li key={name}>
            <span className="font-medium">{name}:</span> {JSON.stringify(value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
