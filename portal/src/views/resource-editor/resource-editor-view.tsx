import { useState } from 'react';
import { SvgIcon } from '../common/svg-icons';
import { ResourceViewSwitcherView, type ResourceViewOption } from './resource-view-switcher-view';

export interface ResourceEditorViewProps {
  icon: string;
  leadingVisual?: React.ReactNode;
  name: string;
  isNameValid: boolean;
  isNameReadOnly: boolean;
  onNameChange?: (name: string) => void;
  detailsId?: string;
  details?: React.ReactNode;
  canSave?: boolean;
  onSave?: () => Promise<void>;
  viewSwitcherOptions?: ResourceViewOption[];
  viewSwitcherDisabledReason?: string;
  children: React.ReactNode;
}

export function ResourceEditorView(props: ResourceEditorViewProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const nameInputLabelClassName = `flex h-9 w-full max-w-md overflow-hidden rounded-md border bg-transparent transition-colors focus-within:bg-white ${
    props.isNameValid ? 'border-transparent focus-within:border-slate-300' : 'border-red-300 bg-red-50/30 focus-within:border-red-400'
  }`;
  const detailsId = props.detailsId ?? 'resource-editor-details';

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-stretch border-b border-slate-200">
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4 px-3 py-3 sm:px-5">
          <div className="w-full min-w-0 space-y-1 sm:w-auto sm:flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {props.leadingVisual}
              <label className={nameInputLabelClassName}>
                <span className="inline-flex h-full w-8 shrink-0 items-center justify-center border-r border-transparent bg-slate-50 text-lg font-semibold text-slate-600 transition-colors focus-within:border-slate-300 focus-within:bg-slate-50">
                  {props.icon}
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
            </div>
            {props.details && isDetailsExpanded && props.details}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {props.onSave && (
              <button
                type="button"
                disabled={!props.canSave}
                onClick={async e => {
                  e.preventDefault();
                  try {
                    if (props.onSave) {
                      await props.onSave();
                    }
                  } catch (e) {
                    alert(`Failed to save: ${(e as Error)?.message ?? e}`);
                  }
                }}
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
                aria-controls={detailsId}
                onClick={() => setIsDetailsExpanded(isExpanded => !isExpanded)}
                className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <SvgIcon name={isDetailsExpanded ? 'chevronUp' : 'chevronDown'} className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {props.viewSwitcherOptions && props.viewSwitcherOptions.length > 1 && (
          <div className="shrink-0 border-l border-slate-200 px-3 py-3 sm:px-5">
            <ResourceViewSwitcherView options={props.viewSwitcherOptions} disabledReason={props.viewSwitcherDisabledReason} />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{props.children}</div>
    </div>
  );
}
