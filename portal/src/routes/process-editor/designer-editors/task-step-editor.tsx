import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { AgentStep, ProcessDefinition } from '@aila/model';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { DefinitionPath } from '../../../core/definition-path';

export function TaskStepEditor(props: StepEditorProps) {
  const { id, name, step, definition, setName } = useStepEditor<AgentStep, ProcessDefinition>();
  const errors = props.editorState.stepValidator.validate(step, definition);

  function editForm() {
    const path = DefinitionPath.createStepPath(id, `properties.form`);
    props.editorState.switchToFormEditor(path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <EditorPropertyView label="Input Form">
        <EnabledSubValuePreviewView onEdit={editForm}>Form is not defined</EnabledSubValuePreviewView>
      </EditorPropertyView>
    </DesignerEditorView>
  );
}
