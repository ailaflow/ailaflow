export function CenteredFormLayout(props: { children: React.ReactNode | React.ReactNode[] }) {
  return (
    <main className="h-screen w-screen overflow-hidden bg-white text-slate-900">
      <section className="flex h-full w-full items-center justify-center bg-white p-6">{props.children}</section>
    </main>
  );
}
