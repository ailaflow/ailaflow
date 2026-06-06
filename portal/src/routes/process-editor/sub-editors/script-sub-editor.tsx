import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import { DefinitionPath } from '../../../core/definition-path';
import { Script } from '@aila/model';
import { useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';

export function ScriptSubEditor() {
  const state = useProcessEditor();

  const [script, setScript] = useState(() => {
    return DefinitionPath.readPath<Script>(state.definition.value, state.path!);
  });

  function ok() {
    const newDefinition = {
      ...state.definition.value
    };
    DefinitionPath.writePath(newDefinition, state.path!, script);
    state.setDefinition(wrapDefinition(newDefinition));
    state.switchToDesigner();
  }

  return (
    <ProcessSubEditorView title="Script Editor" canOk={true} onCancel={state.switchToDesigner} onOk={ok}>
      {script.sandboxName ? `Sandbox: ${script.sandboxName}` : 'No sandbox'}
    </ProcessSubEditorView>
  );
}
