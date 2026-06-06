import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { SubValuePreviewView } from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { StepEditorProps } from './step-editor';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { ProcessStepValidator, ScriptStep } from '@aila/model';
import { DefinitionPath } from '../../../core/definition-path';

export function ScriptStepEditor(props: StepEditorProps) {
  const { id, name, step, setName } = useStepEditor<ScriptStep>();
  const errors = ProcessStepValidator.validate(step);

  function editScript() {
    const path = DefinitionPath.createStepPath(id, 'properties.script');
    props.editorState.switchToScriptEditor(path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <EditorPropertyView label="Script">
        <SubValuePreviewView onEdit={editScript}>Script is not defined</SubValuePreviewView>
      </EditorPropertyView>
    </DesignerEditorView>
  );
}
