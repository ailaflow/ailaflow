import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { ProcessDefinition, ReturnStep } from '@aila/model';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer-editors/variable-selector-property-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import {
  DisabledSubValuePreviewView,
  EnabledSubValuePreviewView
} from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { DefinitionPath } from '../../../core/definition-path';
import { createEmptyFormDefinition } from '../designer-configuration';

export function ReturnStepEditor(props: StepEditorProps) {
  const { name, step, properties, definition, setName, setProperty } = useStepEditor<ReturnStep, ProcessDefinition>();
  const errors = props.editorState.stepValidator.validate(step, definition);

  function addOutputForm() {
    setProperty('outputForm', createEmptyFormDefinition());
  }

  function editOutputFrom() {
    const path = DefinitionPath.createStepPath(step.id, `properties.outputForm`);
    props.editorState.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, path);
  }

  function removeOutputForm() {
    setProperty('outputForm', undefined);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']} />

      <EditorPropertyView label="Output Form">
        {!properties.outputForm && <DisabledSubValuePreviewView onEnable={addOutputForm} label="Enable" />}
        {properties.outputForm && (
          <EnabledSubValuePreviewView onEdit={editOutputFrom} onRemove={removeOutputForm}>
            Form
          </EnabledSubValuePreviewView>
        )}
      </EditorPropertyView>

      <VariableSelectorPropertyView
        label="Output Variables"
        variables={definition.properties.variables}
        variableNames={properties.outputVariableNames}
        onChange={n => setProperty('outputVariableNames', n)}
        error={errors['properties.outputVariableNames']}
      />
    </DesignerEditorView>
  );
}
