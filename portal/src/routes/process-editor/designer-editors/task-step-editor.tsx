import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { ProcessDefinition, TaskStep } from '@aila/model';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { DefinitionPath } from '../../../core/definition-path';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer-editors/variable-selector-property-view';

export function TaskStepEditor(props: StepEditorProps) {
  const { id, name, step, properties, definition, setName, setProperty } = useStepEditor<TaskStep, ProcessDefinition>();
  const errors = props.editorState.stepValidator.validate(step, definition);

  function editForm() {
    const path = DefinitionPath.createStepPath(id, `properties.form`);
    props.editorState.switchToFormEditor(path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <EditorPropertyView label="Form">
        <EnabledSubValuePreviewView onEdit={editForm}>Form</EnabledSubValuePreviewView>
      </EditorPropertyView>

      <VariableSelectorPropertyView
        label="Input Variables"
        variables={definition.properties.variables}
        variableNames={properties.inputVariableNames}
        onChange={n => setProperty('inputVariableNames', n)}
        error={errors['properties.readableVariableNames']}
      />

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
