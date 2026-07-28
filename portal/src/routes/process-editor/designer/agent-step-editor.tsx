import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { AgentStep, ProcessDefinition } from '@aila/model';

export function AgentStepEditor(props: StepEditorProps) {
  const { name, step, setName, definition } = useStepEditor<AgentStep, ProcessDefinition>();
  const errors = props.state.stepValidator.validate(step, definition);

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>
    </DesignerEditorView>
  );
}
