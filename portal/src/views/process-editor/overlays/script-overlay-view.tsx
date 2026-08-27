export function ScriptOverlayView(props: { children: React.ReactNode }) {
  return <div className="grid h-full min-h-0 grid-cols-[260px_minmax(0,1fr)] bg-white">{props.children}</div>;
}
