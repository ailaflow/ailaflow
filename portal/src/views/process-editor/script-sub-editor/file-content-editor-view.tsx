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
        <textarea
          value={props.content}
          onChange={e => props.onContentChange(e.target.value)}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-white p-4 font-mono text-sm leading-6 text-slate-900 outline-none"
        />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-slate-500">Select or create a file.</div>
      )}
    </section>
  );
}
