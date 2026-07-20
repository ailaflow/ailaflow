import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { ProcessDefinition, ReturnStep } from '@aila/model';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer-editors/variable-selector-property-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';

export function ReturnStepEditor(props: StepEditorProps) {
  const { name, step, properties, definition, setName, setProperty } = useStepEditor<ReturnStep, ProcessDefinition>();
  const errors = props.editorState.stepValidator.validate(step, definition);

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']} />

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
