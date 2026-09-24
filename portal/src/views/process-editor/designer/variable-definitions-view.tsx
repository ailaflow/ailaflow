import { VariableDefinition } from '@ailaflow/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { SvgIcon } from '../../common/svg-icons';

export interface VariableDefinitionsViewProps {
  variables: VariableDefinition[];
  errors: Record<string, string>;
  onChange: (index: number, patch: Partial<VariableDefinition>) => void;
  onEditSchema: (index: number) => void;
  onRemove: (index: number) => void;
}

export function VariableDefinitionsView(props: VariableDefinitionsViewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const previousVariableCount = useRef(props.variables.length);
  const descriptionIdPrefix = useId();

  useEffect(() => {
    if (props.variables.length > previousVariableCount.current) {
      setExpandedIndex(props.variables.length - 1);
    }
    previousVariableCount.current = props.variables.length;
  }, [props.variables.length]);

  if (props.variables.length === 0) {
    return <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">No variables yet.</div>;
  }

  function removeVariable(index: number) {
    setExpandedIndex(currentIndex => {
      if (currentIndex === null || currentIndex < index) {
        return currentIndex;
      }
      if (currentIndex === index) {
        return null;
      }
      return currentIndex - 1;
    });
    props.onRemove(index);
  }

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
      {props.variables.map((variable, index) => {
        const nameError = props.errors[`variables.${index}.name`];
        const schemaError = props.errors[`variables.${index}.schema`];
        const isExpanded = expandedIndex === index;
        const descriptionId = `${descriptionIdPrefix}-${index}-description`;

        return (
          <div key={`var_${index}`} className={nameError ? 'bg-red-50/30' : 'bg-white'}>
            <div className="flex items-start gap-2 px-2 py-2.5">
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
                <span className="font-medium text-slate-700">{getVariableSchema(variable)}</span>
              </button>

              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                aria-expanded={isExpanded}
                aria-controls={descriptionId}
                aria-label={`${isExpanded ? 'Hide' : variable.description ? 'Edit' : 'Add'} description for variable ${
                  variable.name || index + 1
                }`}
                title={isExpanded ? 'Hide description' : variable.description ? 'Edit description' : 'Add description'}
              >
                <SvgIcon name="chevronDown" className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => removeVariable(index)}
                className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label={`Remove variable ${variable.name || index + 1}`}
                title="Remove variable"
              >
                <SvgIcon name="x" className="h-4 w-4" />
              </button>
            </div>

            {nameError && <div className="px-3 pb-2 text-xs text-red-700">{nameError}</div>}

            {!isExpanded && variable.description && (
              <button
                type="button"
                onClick={() => setExpandedIndex(index)}
                className="cursor-pointer block w-full truncate px-3 pb-2 text-left text-xs text-slate-500 hover:text-slate-700"
                title={variable.description}
              >
                {variable.description}
              </button>
            )}

            {isExpanded && (
              <div id={descriptionId} className="px-2 pb-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                <textarea
                  rows={4}
                  value={variable.description}
                  onChange={event => props.onChange(index, { description: event.target.value })}
                  className="min-h-9 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Describe how this variable is used..."
                  aria-label={`Description for variable ${variable.name || index + 1}`}
                />
              </div>
            )}

            {schemaError && <div className="px-3 pb-2 text-xs text-red-700">{schemaError}</div>}
          </div>
        );
      })}
    </div>
  );
}

function getVariableSchema(variable: VariableDefinition) {
  const v = variable.schema as {
    type?: string;
    oneOf?: unknown[];
    anyOf?: unknown[];
  };
  if (v.type) {
    return v.type;
  }
  if (v.oneOf) {
    return 'oneOf';
  }
  if (v.anyOf) {
    return 'anyOf';
  }
  return 'unknown';
}
