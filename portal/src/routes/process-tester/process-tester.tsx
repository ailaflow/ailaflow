import type { ProcessDto } from '@aila/model';
import { ProcessTesterView } from '../../views/process-tester/process-tester-view';
import { ProcessTesterChats } from './process-tester-chats';
import { ProcessTesterTop } from './process-tester-top';
import { useNavigate } from 'react-router';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';

export interface ProcessTesterProps {
  process: ProcessDto;
}

export function ProcessTester(props: ProcessTesterProps) {
  const navigate = useNavigate();

  function openEditor() {
    navigate(`/admin/processes/${props.process.name}`);
  }

  return (
    <ResourceEditorView
      icon="/"
      name={props.process.name}
      isNameReadOnly={true}
      isNameValid={true}
      switchLabel="Edit"
      canSwitch={true}
      onSwitch={openEditor}
    >
      <ProcessTesterView>
        <ProcessTesterTop />
        <ProcessTesterChats />
      </ProcessTesterView>
    </ResourceEditorView>
  );
}
