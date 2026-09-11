export interface EditorPropertyViewProps {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  buttons?: {
    command: string;
    label: string;
  }[];
  onButtonClick?: (command: string) => void;
}

export function EditorPropertyView(props: EditorPropertyViewProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-800">{props.label}</div>
        {props.action}
        {props.buttons &&
          props.buttons.map(button => (
            <button
              key={button.command}
              type="button"
              className="cursor-pointer inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => props.onButtonClick?.(button.command)}
            >
              {button.label}
            </button>
          ))}
      </div>
      <div className="space-y-2">{props.children}</div>
    </>
  );
}
