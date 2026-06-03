import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditor } from '../../../components/process-editor/designer-editors/designer-editor';
import { SubValuePreview } from '../../../components/process-editor/designer-editors/sub-value-preview';
import { StepEditorProps } from './step-editor';
import { EditorProperty } from '../../../components/process-editor/designer-editors/editor-property';
import { StringEditorProperty } from '../../../components/process-editor/designer-editors/string-editor-property';
import { ProcessStepValidator, ScriptStep } from '@aila/model';

export function ScriptStepEditor(props: StepEditorProps) {
  const { id, name, step, setName } = useStepEditor<ScriptStep>();
  const errors = ProcessStepValidator.validate(step);

  function editScript() {
    props.editorState.switchToScriptEditor(`step:${id}/properties.script`);
  }

  return (
    <DesignerEditor>
      <StringEditorProperty label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorProperty>

      <EditorProperty label="Script">
        <SubValuePreview onEdit={editScript}>Script is not defined</SubValuePreview>
      </EditorProperty>
    </DesignerEditor>
  );
}
