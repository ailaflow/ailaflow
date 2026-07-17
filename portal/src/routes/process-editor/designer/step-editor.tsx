import { useStepEditor } from 'sequential-workflow-designer-react';
import { ScriptStepEditor } from './script-step-editor';
import { AgentStepEditor } from './agent-step-editor';
import { NotificationStepEditor } from './notification-step-editor';
import { TaskStepEditor } from './task-step-editor';
import { Fragment } from 'react';
import { ProcessEditorState } from '../process-editor-context';

export interface StepEditorProps {
  editorState: ProcessEditorState;
}

export function StepEditor(props: StepEditorProps) {
  const { type } = useStepEditor();

  if (type === 'script') {
    return <ScriptStepEditor editorState={props.editorState} />;
  }
  if (type === 'agent') {
    return <AgentStepEditor editorState={props.editorState} />;
  }
  if (type === 'notification') {
    return <NotificationStepEditor editorState={props.editorState} />;
  }
  if (type === 'task') {
    return <TaskStepEditor editorState={props.editorState} />;
  }
  return <Fragment />;
}
