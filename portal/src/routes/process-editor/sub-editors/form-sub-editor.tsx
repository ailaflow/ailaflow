import { useProcessEditor } from '../process-editor-context';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import { useState } from 'react';
import { DefinitionPath } from '../../../core/definition-path';
import { FormDefinition } from '@aila/model';

export function FormSubEditor() {
  const state = useProcessEditor();

  const e = state.variableValidator.validateVariableExists('s', state.definition.value);

  const [form, setForm] = useState(() => {
    const f = DefinitionPath.readPath<FormDefinition>(state.definition.value, state.subPath!);
    return {
      form: f,
      isValid: true
    };
  });

  return (
    <ProcessSubEditorView title="Form Editor" canOk={true} onCancel={state.switchToDesigner} onOk={() => {}}>
      {JSON.stringify(form.form, null, 2)}
    </ProcessSubEditorView>
  );
}
