import type { ProcessDto } from '@ailaflow/shared';
import { ProcessTesterView } from '../../views/process-tester/process-tester-view';
import { ProcessTesterChats } from './process-tester-chats';
import { ProcessTesterTimeline } from './process-tester-timeline';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useProcessTester } from './process-tester-context';
import { useProcessTesterAi } from './process-tester-ai';
import { ProcessIcon } from '../../views/common/process-icon';

export interface ProcessTesterProps {
  process: ProcessDto;
}

export function ProcessTester(props: ProcessTesterProps) {
  const state = useProcessTester();

  useProcessTesterAi(state);

  return (
    <ResourceEditorView
      icon="/"
      leadingVisual={<ProcessIcon name={props.process.name} icon={props.process.icon} className="h-9 w-9" />}
      name={props.process.name}
      isNameReadOnly={true}
      isNameValid={true}
      viewSwitcherOptions={[
        { label: 'Editor', href: `/admin/processes/${props.process.name}` },
        { label: 'Test', href: `/admin/processes/${props.process.name}/test`, selected: true },
        { label: 'Cron jobs', href: `/admin/processes/${props.process.name}/cron-jobs` }
      ]}
    >
      <ProcessTesterView>
        <ProcessTesterTimeline />
        <ProcessTesterChats />
      </ProcessTesterView>
    </ResourceEditorView>
  );
}
