import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { SubValuePreviewView } from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { StepEditorProps } from './step-editor';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { SelectEditorPropertyView } from '../../../views/process-editor/designer-editors/select-editor-property-view';
import { ScriptStep } from '@aila/model';
import { DefinitionPath } from '../../../core/definition-path';

export function ScriptStepEditor(props: StepEditorProps) {
  const { id, name, step, setName, properties, setProperty } = useStepEditor<ScriptStep>();
  const errors = props.editorState.stepValidator.validate(step);

  function editScript() {
    const path = DefinitionPath.createStepPath(id, 'properties.script');
    props.editorState.switchToScriptEditor(path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <EditorPropertyView label="Script">
        <SubValuePreviewView onEdit={editScript} error={errors['properties.script']}>
          {step.properties.script.contents.length > 0 && step.properties.script.contents.map(c => <p>{c.path}</p>)}
          {step.properties.script.contents.length === 0 && <>No script files</>}
        </SubValuePreviewView>
      </EditorPropertyView>

      <SelectEditorPropertyView
        label="Sandbox"
        value={properties.script.sandboxName}
        options={props.editorState.sandboxNames.map(sandboxName => ({
          label: `+${sandboxName}`,
          value: sandboxName
        }))}
        error={errors['properties.sandboxName']}
        onValueChanged={sandboxName => setProperty('script', { ...properties.script, sandboxName })}
      />
    </DesignerEditorView>
  );
}
