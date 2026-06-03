import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditor } from '../../../components/process-editor/process-sub-editor';

export function ScriptSubEditor() {
  const state = useProcessEditor();
  const path = state.path;
  if (!path) {
    throw new Error('Path is required');
  }

  return (
    <ProcessSubEditor title="Script Editor" canOk={true} onCancel={state.switchToDesigner} onOk={() => {}}>
      {path}
    </ProcessSubEditor>
  );
}
