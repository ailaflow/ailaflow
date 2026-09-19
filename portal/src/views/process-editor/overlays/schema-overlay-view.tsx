import { CodeMirror } from '../../common/codemirror';

export interface SchemaOverlayViewProps {
  schema: string;
  onSchemaChange: (schema: string) => void;
}

export function SchemaOverlayView(props: SchemaOverlayViewProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <CodeMirror value={props.schema} language="json" ariaLabel="JSON schema" onChange={props.onSchemaChange} />
    </section>
  );
}
