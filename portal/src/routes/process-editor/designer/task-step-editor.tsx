import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { ProcessDefinition, TaskStep } from '@aila/model';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { DefinitionPath } from '../../../core/definition-path';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer-editors/variable-selector-property-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { StringOrVariablePropertyView } from '../../../views/process-editor/designer-editors/string-or-variable-property-view';

export function TaskStepEditor(props: StepEditorProps) {
  const { id, name, step, properties, definition, setName, setProperty } = useStepEditor<TaskStep, ProcessDefinition>();
  const errors = props.state.stepValidator.validate(step, definition);

  function editForm() {
    const path = DefinitionPath.createStepPath(id, `properties.form`);
    props.state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <StringOrVariablePropertyView
        label="Title"
        value={properties.title}
        variables={definition.properties.variables}
        onValueChanged={v => setProperty('title', v)}
        error={errors['properties.title']}
      />

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

      <StringOrVariablePropertyView
        label="User Expression"
        value={properties.userExpression}
        variables={definition.properties.variables}
        onValueChanged={v => setProperty('userExpression', v)}
        error={errors['properties.userExpression']}
      />
    </DesignerEditorView>
  );
}
