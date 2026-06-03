import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditor } from '../../../components/process-editor/designer-editors/designer-editor';
import { StepEditorProps } from './step-editor';
import { StringEditorProperty } from '../../../components/process-editor/designer-editors/string-editor-property';
import { NotificationStep, ProcessStepValidator } from '@aila/model';

export function NotificationStepEditor(_props: StepEditorProps) {
  const { name, step, setName } = useStepEditor<NotificationStep>();
  const errors = ProcessStepValidator.validate(step);

  return (
    <DesignerEditor>
      <StringEditorProperty label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorProperty>
    </DesignerEditor>
  );
}
