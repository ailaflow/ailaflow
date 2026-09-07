import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { AgentStep, ProcessDefinition } from '@aila/model';
import { DropdownPropertyView } from '../../../views/process-editor/designer/dropdown-property-view';
import { StringOrVariablePropertyView } from '../../../views/process-editor/designer/string-or-variable-property-view';
import { useState } from 'react';
import { FindProcessesPopup } from '../../common/popups/find-processes-popup';
import { AllowedProcessesPropertyView } from '../../../views/process-editor/designer/allowed-processes-property-view';

export function AgentStepEditor(props: StepEditorProps) {
  const { name, step, properties, definition, setName, setProperty } = useStepEditor<AgentStep, ProcessDefinition>();
  const [isFindProcessesPopupOpen, setIsFindProcessesPopupOpen] = useState(false);
  const errors = props.state.stepValidator.validate(step, definition);

  function onSelectProcesses(names: string[]) {
    setProperty('allowedProcesses', names);
    setIsFindProcessesPopupOpen(false);
  }

  return (
    <DesignerEditorView>
      {isFindProcessesPopupOpen && (
        <FindProcessesPopup
          apiClient={props.state.apiClient}
          onSelectProcesses={onSelectProcesses}
          processNames={properties.allowedProcesses ?? []}
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

      <AllowedProcessesPropertyView
        processNames={properties.allowedProcesses}
        onAllowAll={() => setProperty('allowedProcesses', null)}
        onEdit={() => setIsFindProcessesPopupOpen(true)}
        error={errors['properties.allowedProcesses']}
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
