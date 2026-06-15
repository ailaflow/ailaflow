export function IframeFormView(props: { setIframe: (iframe: HTMLIFrameElement | null) => void; content: string }) {
  return (
    <div className="w-full h-full">
      <iframe ref={props.setIframe} sandbox="allow-scripts" srcDoc={props.content} className="h-full w-full border-0" />
    </div>
  );
}
