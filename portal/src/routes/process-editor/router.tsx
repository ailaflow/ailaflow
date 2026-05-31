import { useState } from 'react';
import { ProcessEditorMode, useProcessEditor } from './process-editor-context';
import { SchemaSubEditor } from './schema-sub-editor';
import { DesignerSubEditor } from './designer-sub-editor';
import { useApiClient } from '../../auth/auth-context';

export function Router() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const isDesigner = state.mode === ProcessEditorMode.DESIGNER;
  const nameInputLabelClassName = `flex h-9 w-full max-w-md overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    state.isNameValid ? 'border-transparent focus-within:border-slate-300' : 'border-red-300 bg-red-50/30 focus-within:border-red-400'
  }`;
  const canSave = state.definition.isValid && state.isDirty;

  async function save() {
    if (!canSave) {
      return;
    }

    try {
      const timeout = AbortSignal.timeout(5000);
      const response = await apiClient.process.updateProcess(timeout, {
        id: state.id,
        description: state.description,
        name: state.name,
        userList: '',
        definition: state.definition.value
      });

      state.setId(response.id, false);
    } catch (e) {
      alert(`Failed to save process: ${(e as Error).message ?? e}`);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 px-5 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <label className={nameInputLabelClassName}>
              <span className="inline-flex h-full w-8 shrink-0 items-center justify-center border-r border-transparent bg-slate-50 text-lg font-semibold text-slate-600 transition-colors focus-within:border-slate-300 focus-within:bg-slate-50">
                /
              </span>
              <input
                type="text"
                value={state.name}
                readOnly={state.mode !== ProcessEditorMode.DESIGNER}
                onChange={e => state.setName(e.target.value)}
                aria-invalid={!state.isNameValid}
                className="h-full min-w-0 flex-1 px-2 text-lg font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            {isDesigner && isDetailsExpanded && (
              <div id="admin-process-editor-details" className="pt-1">
                <label className="flex h-8 w-full max-w-md overflow-hidden rounded-md border border-transparent bg-transparent transition-colors focus-within:border-slate-300 focus-within:bg-white">
                  <input
                    type="text"
                    value={state.description}
                    onChange={e => state.setDescription(e.target.value)}
                    className="h-full min-w-0 flex-1 px-2 text-sm text-slate-600 outline-none placeholder:text-slate-400"
                    placeholder="Description"
                  />
                </label>
              </div>
            )}
          </div>

          {isDesigner && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={!canSave}
                onClick={save}
                className="inline-flex h-9 shrink-0 items-center rounded-md border cursor-pointer border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:hover:bg-slate-300"
              >
                Save
              </button>

              <button
                type="button"
                aria-expanded={isDetailsExpanded}
                aria-controls="admin-process-editor-details"
                onClick={() => setIsDetailsExpanded(isExpanded => !isExpanded)}
                className="inline-flex h-9 shrink-0 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                {isDetailsExpanded ? 'Hide details' : 'Show details'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isDesigner && <DesignerSubEditor />}
        {state.mode === ProcessEditorMode.SCHEMA_EDITOR && <SchemaSubEditor />}
      </div>
    </div>
  );
}
