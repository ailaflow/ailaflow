import { useState } from 'react';

export interface ProcessEditorViewProps {
  name: string;
  isNameValid: boolean;
  isNameReadOnly: boolean;
  onNameChange?: (name: string) => void;
  areDetailsVisible?: boolean;
  details?: React.ReactNode;
  canSave?: boolean;
  onSave?: () => void;
  canSwitch: boolean;
  onSwitch?: () => void;
  switchLabel: string;
  children: React.ReactNode;
}

export function ProcessEditorView(props: ProcessEditorViewProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const nameInputLabelClassName = `flex h-9 w-full max-w-md overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.isNameValid ? 'border-transparent focus-within:border-slate-300' : 'border-red-300 bg-red-50/30 focus-within:border-red-400'
  }`;

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
                value={props.name}
                readOnly={props.isNameReadOnly}
                onChange={e => props.onNameChange && props.onNameChange(e.target.value)}
                aria-invalid={!props.isNameValid}
                className="h-full min-w-0 flex-1 px-2 text-lg font-semibold tracking-tight text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>

            {props.areDetailsVisible && isDetailsExpanded && props.details}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {props.onSave && (
              <button
                type="button"
                disabled={!props.canSave}
                onClick={props.onSave}
                className="inline-flex h-9 shrink-0 items-center rounded-md border cursor-pointer border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:hover:bg-slate-300"
              >
                Save
              </button>
            )}

            {props.details && (
              <button
                type="button"
                aria-label={isDetailsExpanded ? 'Hide details' : 'Show details'}
                aria-expanded={isDetailsExpanded}
                aria-controls="admin-process-editor-details"
                onClick={() => setIsDetailsExpanded(isExpanded => !isExpanded)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d={isDetailsExpanded ? 'M5 12.5L10 7.5L15 12.5' : 'M5 7.5L10 12.5L15 7.5'}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {(props.onSave || props.details) && <span className="text-gray-300">|</span>}
            {props.onSwitch && (
              <button
                type="button"
                onClick={props.onSwitch}
                disabled={!props.canSwitch}
                className="inline-flex h-9 shrink-0 items-center rounded-md border cursor-pointer border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:hover:bg-slate-300"
              >
                {props.switchLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{props.children}</div>
    </div>
  );
}
