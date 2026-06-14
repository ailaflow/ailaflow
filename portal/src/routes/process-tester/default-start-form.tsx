import { ProcessDefinition } from '@aila/model';
import { useState } from 'react';

export interface DefaultStartFormProps {
  definition: ProcessDefinition;
  onSubmit: (data: Record<string, unknown>) => void;
}

export function DefaultStartForm(props: DefaultStartFormProps) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const inputVariables = props.definition.properties.startVariableNames.map(
    n => props.definition.properties.variables.find(v => v.name === n)!
  );

  return (
    <div className="h-full overflow-auto bg-slate-50 p-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Start process</h2>
          <p className="mt-1 text-sm text-slate-500">Provide input values for this test run.</p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          {inputVariables.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              This process does not define any input variables.
            </div>
          ) : (
            <div className="space-y-4">
              {inputVariables.map(variable => (
                <label key={variable.name} className="block space-y-1.5">
                  <span className="block text-sm font-medium text-slate-700">{variable.name}</span>
                  {variable.description && <span className="block text-xs text-slate-500">{variable.description}</span>}
                  <textarea
                    value={(data[variable.name] as string) || ''}
                    onChange={e => setData(prev => ({ ...prev, [variable.name]: e.target.value }))}
                    className="min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
                    placeholder="Enter value..."
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => props.onSubmit(data)}
            className="inline-flex h-9 items-center justify-center rounded-md border cursor-pointer border-slate-900 bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Start process
          </button>
        </div>
      </div>
    </div>
  );
}
