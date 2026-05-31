import { useStepEditor } from 'sequential-workflow-designer-react';
import { ScriptStepEditor } from './script-step-editor';
import { Fragment } from 'react';

export function StepEditor() {
  const { type } = useStepEditor();

  if (type === 'script') {
    return <ScriptStepEditor />;
  }

  return <Fragment />;
}
