export function PortalLayout(props: { children: React.ReactNode | React.ReactNode[] }) {
  return (
    <div>
      <div>MENU</div>
      <div>{props.children}</div>
    </div>
  );
}
