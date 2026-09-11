import { AilaFlowLogo } from '../common/aila-flow-logo';

export function CenteredFormLayout(props: { children: React.ReactNode | React.ReactNode[] }) {
  return (
    <main className="h-screen w-screen overflow-auto bg-white text-slate-900">
      <section className="flex min-h-full w-full items-center justify-center bg-white p-6">
        <div className="flex w-full flex-col items-center gap-5">
          <AilaFlowLogo className="h-20 w-20 object-contain" />
          {props.children}
        </div>
      </section>
    </main>
  );
}
