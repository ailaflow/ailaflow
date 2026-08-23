export interface ProcessTesterViewProps {
  children: React.ReactNode;
}

export function ProcessTesterView(props: ProcessTesterViewProps) {
  return <div className="grid h-full min-h-0 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] overflow-hidden bg-white">{props.children}</div>;
}
