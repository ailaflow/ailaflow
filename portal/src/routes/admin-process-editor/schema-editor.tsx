import { useAdminProcessEditor } from './admin-process-editor-context';

export function SchemaEditor() {
  const state = useAdminProcessEditor();

  return (
    <div>
      <h1>Schema Editor</h1>
      <p>This is where the schema editor will be implemented.</p>
      <pre>{JSON.stringify(state.definition.value, null, 2)}</pre>
    </div>
  );
}
