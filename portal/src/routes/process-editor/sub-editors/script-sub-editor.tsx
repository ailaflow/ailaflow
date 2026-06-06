import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditor } from '../../../components/process-editor/process-sub-editor';
import { DefinitionPath } from '../../../core/definition-path';
import { Script } from '@aila/model';

export function ScriptSubEditor() {
  const state = useProcessEditor();
  const script = DefinitionPath.readPath<Script>(state.definition.value, state.path!);

  return (
    <ProcessSubEditor title="Script Editor" canOk={true} onCancel={state.switchToDesigner} onOk={() => {}}>
      {script.sandboxName ? `Sandbox: ${script.sandboxName}` : 'No sandbox'}
    </ProcessSubEditor>
  );
}
