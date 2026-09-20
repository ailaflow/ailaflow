import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { AgentStep, ProcessDefinition } from '@ailaflow/shared';
import { DropdownPropertyView } from '../../../views/process-editor/designer/dropdown-property-view';
import { StringOrVariablePropertyView } from '../../../views/process-editor/designer/string-or-variable-property-view';
import { useState } from 'react';
import { FindProcessesPopup } from '../../common/popups/find-processes-popup';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer/variable-selector-property-view';
import { EditorHeaderView } from '../../../views/process-editor/designer/editor-header-view';
import { ProcessSelectorPropertyView } from '../../../views/process-editor/designer/process-selector-property-view';

export function AgentStepEditor(props: StepEditorProps) {
  const { name, step, properties, definition, setName, setProperty } = useStepEditor<AgentStep, ProcessDefinition>();
  const [isFindProcessesPopupOpen, setIsFindProcessesPopupOpen] = useState(false);
  const errors = props.state.stepValidator.validate(step, definition);

  function onSelectProcesses(names: string[]) {
    setProperty('allowedProcessNames', names);
    setIsFindProcessesPopupOpen(false);
  }

  return (
    <DesignerEditorView>
      <EditorHeaderView
        header="Agent"
        explanation="Runs an AI agent with the configured prompt and access to selected processes, variables, and sandbox tools."
      />

      {isFindProcessesPopupOpen && (
        <FindProcessesPopup
          apiClient={props.state.apiClient}
          onSelectProcesses={onSelectProcesses}
          processNames={properties.allowedProcessNames}
          onClose={() => setIsFindProcessesPopupOpen(false)}
        />
      )}

      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']} />

      <StringOrVariablePropertyView
        label="Prompt"
        value={properties.prompt}
        variables={definition.properties.variables}
        multiline={4}
        onValueChanged={v => setProperty('prompt', v)}
        error={errors['properties.prompt']}
      />

      <ProcessSelectorPropertyView
        label="Allowed Processes"
        processNames={properties.allowedProcessNames}
        onChange={names => setProperty('allowedProcessNames', names)}
        onOpenSelector={() => setIsFindProcessesPopupOpen(true)}
        error={errors['properties.allowedProcessNames']}
      />

      <VariableSelectorPropertyView
        label="Allowed Variables"
        variables={definition.properties.variables}
        variableNames={properties.allowedVariableNames}
        onChange={n => setProperty('allowedVariableNames', n)}
        error={errors['properties.allowedVariableNames']}
      />

      <DropdownPropertyView
        label="Sandbox"
        value={properties.sandboxName}
        options={props.state.sandboxes.map(sandbox => ({
          label: `+${sandbox.name}`,
          value: sandbox.name
        }))}
        error={errors['properties.sandboxName']}
        onValueChanged={sandboxName => setProperty('sandboxName', sandboxName)}
      />

      <DropdownPropertyView
        label="Can Use Sandbox Terminal?"
        value={properties.isTerminalAllowed ? 'true' : 'false'}
        options={[
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]}
        error={errors['properties.isTerminalAllowed']}
        onValueChanged={v => setProperty('isTerminalAllowed', v === 'true')}
      />
    </DesignerEditorView>
  );
}
