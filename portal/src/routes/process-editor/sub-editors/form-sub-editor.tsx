import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';

export function FormSubEditor() {
  const state = useProcessEditor();
  const path = state.path;
  if (!path) {
    throw new Error('Path is required');
  }

  return (
    <ProcessSubEditorView title="Form Editor" canOk={true} onCancel={state.switchToDesigner} onOk={() => {}}>
      {path}
    </ProcessSubEditorView>
  );
}
