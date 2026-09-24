export function FormPreviewView(props: { children: React.ReactNode; width: number; height: number; previewWidth: number }) {
  const scale = props.previewWidth / props.width;
  const previewHeight = props.height * scale;

  return (
    <div
      className="pointer-events-none shrink-0 overflow-hidden border border-slate-200 bg-white rounded-md"
      inert
      style={{
        width: props.previewWidth,
        height: previewHeight
      }}
    >
      <div
        style={{
          width: props.width,
          height: props.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
