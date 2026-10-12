export function FormPreviewView(props: { children: React.ReactNode; width?: number; height?: number; previewWidth?: number }) {
  const width = props.width ?? 800;
  const height = props.height ?? 600;
  const previewWidth = props.previewWidth ?? 250;

  const scale = previewWidth / width;
  const previewHeight = height * scale;

  return (
    <div
      className="pointer-events-none shrink-0 overflow-hidden border border-slate-200 bg-white rounded-md"
      inert
      style={{
        width: previewWidth,
        height: previewHeight
      }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
