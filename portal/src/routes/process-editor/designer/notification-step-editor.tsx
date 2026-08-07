import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { NotificationStep, ProcessDefinition } from '@aila/model';
import { StringOrVariablePropertyView } from '../../../views/process-editor/designer-editors/string-or-variable-property-view';

export function NotificationStepEditor(props: StepEditorProps) {
  const { name, step, definition, properties, setName, setProperty } = useStepEditor<NotificationStep, ProcessDefinition>();
  const errors = props.state.stepValidator.validate(step, definition);
  const stringVariableNames = definition.properties.variables
    .filter(variable => variable.schema.schema.type === 'string')
    .map(variable => variable.name);

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']} />

      <StringOrVariablePropertyView
        label="User Expression"
        value={properties.userExpression}
        variableNames={stringVariableNames}
        onValueChanged={v => setProperty('userExpression', v)}
        error={errors['properties.userExpression']}
      />

      <StringEditorPropertyView
        label="Name"
        value={properties.notification}
        onValueChanged={v => setProperty('notification', v)}
        error={errors['properties.notification']}
      />
    </DesignerEditorView>
  );
}
