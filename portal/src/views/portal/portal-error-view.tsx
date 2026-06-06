export function PortalErrorView(props: { error: Error }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-red-500">
        <h2 className="text-xl font-bold mb-2">An error occurred</h2>
        <p>{props.error.message}</p>
      </div>
    </div>
  );
}
