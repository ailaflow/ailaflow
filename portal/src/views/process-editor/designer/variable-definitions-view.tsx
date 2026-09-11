import { VariableDefinition } from '@ailaflow/shared';
import { SvgIcon } from '../../common/svg-icons';

export interface VariableDefinitionsViewProps {
  variables: VariableDefinition[];
  errors: Record<string, string>;
  onChange: (index: number, patch: Partial<VariableDefinition>) => void;
  onEditSchema: (index: number) => void;
  onRemove: (index: number) => void;
}

export function VariableDefinitionsView(props: VariableDefinitionsViewProps) {
  if (props.variables.length === 0) {
    return <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">No variables yet.</div>;
  }

  return props.variables.map((variable, index) => {
    const nameError = props.errors[`variables.${index}.name`];
    const schemaError = props.errors[`variables.${index}.schema`];

    return (
      <div
        key={`var_${index}`}
        className={`space-y-2 rounded-md border p-2 ${nameError ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
      >
        <div className="flex items-start gap-2">
          <label
            className={`flex h-9 min-w-0 flex-1 overflow-hidden rounded-md border bg-white ${
              nameError ? 'border-red-300' : 'border-slate-300'
            }`}
          >
            <span className="inline-flex h-full w-8 shrink-0 items-center justify-center border-r border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600">
              $
            </span>
            <input
              type="text"
              value={variable.name}
              onChange={event => props.onChange(index, { name: event.target.value })}
              className="h-full min-w-0 flex-1 px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="variable_name"
            />
          </label>

          <button
            type="button"
            onClick={() => props.onEditSchema(index)}
            className={`cursor-pointer inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-slate-50 px-2.5 text-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              schemaError ? 'border-red-300 text-red-700' : 'border-slate-300 text-slate-600 hover:border-slate-400'
            }`}
            aria-label={`Edit schema for variable ${variable.name || index + 1}`}
            title="Edit schema"
          >
            <span className="font-medium text-slate-700">{(variable.schema as { type: string }).type}</span>
          </button>

          <button
            type="button"
            onClick={() => props.onRemove(index)}
            className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white/60 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={`Remove variable ${variable.name || index + 1}`}
            title="Remove variable"
          >
            <SvgIcon name="x" className="h-4 w-4" />
          </button>
        </div>

        {nameError && <div className="px-1 text-xs text-red-700">{nameError}</div>}

        <textarea
          rows={2}
          value={variable.description}
          onChange={event => props.onChange(index, { description: event.target.value })}
          className="min-h-9 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-400 outline-none transition-colors placeholder:text-slate-400 focus:text-slate-700"
          placeholder="Description..."
          aria-label={`Description for variable ${variable.name || index + 1}`}
        />

        {schemaError && <div className="px-1 text-xs text-red-700">{schemaError}</div>}
      </div>
    );
  });
}
