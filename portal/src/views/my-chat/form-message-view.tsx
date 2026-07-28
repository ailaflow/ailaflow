export interface FormMessageViewProps {
  title: string;
  children: React.ReactNode;
}

export function FormMessageView(props: FormMessageViewProps) {
  return (
    <div className="mt-2 flex justify-start">
      <article className="max-w-[88%] rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-slate-800 shadow-sm">
        <div className="mb-1 text-[11px] font-semibold uppercase leading-tight text-orange-700">{props.title}</div>
        <div className="overflow-hidden">{props.children}</div>
      </article>
    </div>
  );
}
