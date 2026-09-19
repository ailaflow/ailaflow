export interface EditorHeaderViewProps {
  header: string;
  explanation: string;
}

export function EditorHeaderView(props: EditorHeaderViewProps) {
  return (
    <header className="pb-2">
      <h2 className="text-xl font-semibold text-slate-900">{props.header}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-600">{props.explanation}</p>
    </header>
  );
}
