import { CodeMirror } from '../codemirror';
import { GenericPopupView } from './generic-popup-view';

export interface TableDataRowEditorPopupViewProps {
  rowId: string;
  json: string;
  isJsonValid: boolean;
  onJsonChange(value: string): void;
  onSave(): void | Promise<void>;
  onClose(): void;
}

export function TableDataRowEditorPopupView(props: TableDataRowEditorPopupViewProps) {
  return (
    <GenericPopupView
      size="large"
      title="Edit table row"
      description={`Row ${props.rowId}`}
      closeLabel="Close table row editor"
      onClose={props.onClose}
    >
      <div className="flex h-full min-h-0 flex-col">
        <CodeMirror value={props.json} language="json" ariaLabel="Table row JSON" onChange={props.onJsonChange} />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <div>
            {!props.isJsonValid ? (
              <p role="alert" className="text-sm text-red-700">
                Enter valid JSON to save this row.
              </p>
            ) : null}
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={props.onClose}
              className="inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void props.onSave()}
              disabled={!props.isJsonValid}
              className="inline-flex h-9 cursor-pointer items-center rounded-md bg-slate-800 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </GenericPopupView>
  );
}
