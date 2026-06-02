import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditor } from '../../../components/process-editor/process-sub-editor';

export function FormSubEditor() {
  const state = useProcessEditor();
  const path = state.path;
  if (!path) {
    throw new Error('Path is required');
  }

  return (
    <ProcessSubEditor title="Form Editor" canOk={true} onCancel={state.switchToDesigner} onOk={() => {}}>
      {path}
    </ProcessSubEditor>
  );
}
