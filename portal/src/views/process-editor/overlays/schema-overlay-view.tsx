import { CodeMirror } from '../../common/codemirror';

const schemaPresets = [
  { label: 'string', schema: { type: 'string' } },
  { label: 'string[]', schema: { type: 'array', items: { type: 'string' } } },
  { label: 'number', schema: { type: 'number' } },
  { label: 'number[]', schema: { type: 'array', items: { type: 'number' } } },
  { label: 'boolean', schema: { type: 'boolean' } },
  { label: 'object', schema: { type: 'object', properties: {} } }
] as const;

export interface SchemaOverlayViewProps {
  schema: string;
  onSchemaChange: (schema: string) => void;
}

export function SchemaOverlayView(props: SchemaOverlayViewProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-300 bg-slate-100 px-4">
        <span className="mr-1 shrink-0 text-xs font-medium text-slate-600">Use schema:</span>
        {schemaPresets.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => props.onSchemaChange(JSON.stringify(preset.schema, null, 2))}
            className="shrink-0 cursor-pointer rounded-md border border-slate-300 bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <CodeMirror value={props.schema} language="json" ariaLabel="JSON schema" onChange={props.onSchemaChange} />
    </section>
  );
}
