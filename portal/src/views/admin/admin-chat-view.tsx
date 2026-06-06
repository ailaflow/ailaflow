export interface AdminChatViewProps {
  children: React.ReactNode;
  chat: React.ReactNode;
}

export function AdminChatView(props: AdminChatViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,7fr)_minmax(0,3fr)] md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:grid-rows-1">
        <section className="min-h-0 bg-white">{props.children}</section>
        <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white md:border-l md:border-t-0">{props.chat}</aside>
      </div>
    </div>
  );
}
