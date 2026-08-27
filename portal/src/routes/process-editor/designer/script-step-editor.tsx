import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { EditorPropertyView } from '../../../views/process-editor/designer/editor-property-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { SelectEditorPropertyView } from '../../../views/process-editor/designer/select-editor-property-view';
import { ProcessDefinition, ScriptStep } from '@aila/model';
import { DefinitionPath } from '../../../core/definition-path';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer/sub-value-preview-view';
import { ProcessEditorOverlayType } from '../process-editor-context';

export function ScriptStepEditor(props: StepEditorProps) {
  const { id, name, step, properties, definition, setName, setProperty } = useStepEditor<ScriptStep, ProcessDefinition>();
  const errors = props.state.stepValidator.validate(step, definition);

  function editScript() {
    const path = DefinitionPath.createStepPath(id, 'properties.script');
    props.state.openOverlay(ProcessEditorOverlayType.SCRIPT_EDITOR, path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <EditorPropertyView label="Script">
        <EnabledSubValuePreviewView onEdit={editScript} error={errors['properties.script']}>
          {step.properties.script.contents.length > 0 && step.properties.script.contents.map(c => <p key={c.path}>{c.path}</p>)}
          {step.properties.script.contents.length === 0 && <>No script files</>}
        </EnabledSubValuePreviewView>
      </EditorPropertyView>

      <SelectEditorPropertyView
        label="Sandbox"
        value={properties.script.sandboxName}
        options={props.state.sandboxes.map(sandbox => ({
          label: `+${sandbox.name}`,
          value: sandbox.name
        }))}
        error={errors['properties.sandboxName']}
        onValueChanged={sandboxName => setProperty('script', { ...properties.script, sandboxName })}
      />
    </DesignerEditorView>
  );
}
