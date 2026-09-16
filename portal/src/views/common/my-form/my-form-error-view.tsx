export interface MyFormErrorViewProps {
  error: Error;
}

export function MyFormErrorView(props: MyFormErrorViewProps) {
  return (
    <div className="flex h-full items-center justify-center p-5" role="alert">
      <div className="text-red-500">
        <h2 className="mb-2 text-xl font-bold">Could not load form</h2>
        <p>{props.error.message}</p>
      </div>
    </div>
  );
}
