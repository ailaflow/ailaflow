import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer-editors/string-editor-property-view';
import { AgentStep } from '@aila/model';

export function AgentStepEditor(props: StepEditorProps) {
  const { name, step, setName } = useStepEditor<AgentStep>();
  const errors = props.editorState.stepValidator.validate(step);

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>
    </DesignerEditorView>
  );
}
