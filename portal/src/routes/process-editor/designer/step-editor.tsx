import { useStepEditor } from 'sequential-workflow-designer-react';
import { ScriptStepEditor } from './script-step-editor';
import { AgentStepEditor } from './agent-step-editor';
import { NotificationStepEditor } from './notification-step-editor';
import { TaskStepEditor } from './task-step-editor';
import { Fragment } from 'react';
import { ProcessEditorState } from '../process-editor-context';
import { ReturnStepEditor } from './return-step-editor';
import { BranchStepEditor } from './branch-step-editor';

export interface StepEditorProps {
  state: ProcessEditorState;
}

export function StepEditor(props: StepEditorProps) {
  const { type } = useStepEditor();

  if (type === 'script') {
    return <ScriptStepEditor state={props.state} />;
  }
  if (type === 'agent') {
    return <AgentStepEditor state={props.state} />;
  }
  if (type === 'notification') {
    return <NotificationStepEditor state={props.state} />;
  }
  if (type === 'task') {
    return <TaskStepEditor state={props.state} />;
  }
  if (type === 'return') {
    return <ReturnStepEditor state={props.state} />;
  }
  if (type === 'branch') {
    return <BranchStepEditor state={props.state} />;
  }
  return <Fragment />;
}
