import { CodeMirror } from '../../common/codemirror';

export interface FileContentEditorViewProps {
  path?: string;
  content: string;
  onContentChange: (newContent: string) => void;
}

export function FileContentEditorView(props: FileContentEditorViewProps) {
  return (
    <section className="flex min-h-0 flex-col bg-white">
      <div className="flex h-10 shrink-0 items-center border-b border-slate-200 bg-slate-50 px-3">
        <span className="truncate text-sm font-medium text-slate-700">{props.path ?? 'No file selected'}</span>
      </div>

      {props.path ? (
        <CodeMirror value={props.content} filePath={props.path} ariaLabel={`Edit ${props.path}`} onChange={props.onContentChange} />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-slate-500">Select or create a file.</div>
      )}
    </section>
  );
}
