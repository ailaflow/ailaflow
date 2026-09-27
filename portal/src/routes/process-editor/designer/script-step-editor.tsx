import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { EditorPropertyView } from '../../../views/process-editor/designer/editor-property-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { DropdownPropertyView } from '../../../views/process-editor/designer/dropdown-property-view';
import { ProcessDefinition, ScriptStep } from '@ailaflow/shared';
import { DefinitionPath } from '../../../core/definition-path';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer/sub-value-preview-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { EditorHeaderView } from '../../../views/process-editor/designer/editor-header-view';
import { ProcessSelectorPropertyView } from '../../../views/process-editor/designer/process-selector-property-view';
import { useState } from 'react';
import { FindProcessesPopup } from '../../common/popups/find-processes-popup';

export function ScriptStepEditor(props: StepEditorProps) {
  const { id, name, step, properties, definition, setName, setProperty } = useStepEditor<ScriptStep, ProcessDefinition>();
  const [isFindProcessesPopupOpen, setIsFindProcessesPopupOpen] = useState(false);
  const errors = props.state.stepValidator.validate(step, definition);

  function editScript() {
    const path = DefinitionPath.createStepPath(id, 'properties.script');
    props.state.openOverlay(ProcessEditorOverlayType.SCRIPT_EDITOR, path);
  }

  function closeFindProcessesPopup(names: string[] | null) {
    if (names !== null) {
      setProperty('script', { ...properties.script, allowedProcessNames: names });
    }
    setIsFindProcessesPopupOpen(false);
  }

  return (
    <DesignerEditorView>
      {isFindProcessesPopupOpen && (
        <FindProcessesPopup
          apiClient={props.state.apiClient}
          processNames={properties.script.allowedProcessNames}
          onClose={closeFindProcessesPopup}
        />
      )}

      <EditorHeaderView header="Script" explanation="Runs a finite script in the selected sandbox." />

      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <EditorPropertyView label="Script">
        <EnabledSubValuePreviewView onEdit={editScript} error={errors['properties.script']}>
          {step.properties.script.contents.length > 0 && step.properties.script.contents.map(c => <p key={c.path}>{c.path}</p>)}
          {step.properties.script.contents.length === 0 && <>No script files</>}
        </EnabledSubValuePreviewView>
      </EditorPropertyView>

      <DropdownPropertyView
        label="Sandbox"
        value={properties.script.sandboxName}
        options={props.state.sandboxes.map(sandbox => ({
          label: `+${sandbox.name}`,
          value: sandbox.name
        }))}
        error={errors['properties.sandboxName']}
        onValueChanged={sandboxName => setProperty('script', { ...properties.script, sandboxName })}
      />

      <ProcessSelectorPropertyView
        label="Allowed Processes"
        processNames={properties.script.allowedProcessNames}
        onChange={names => setProperty('script', { ...properties.script, allowedProcessNames: names })}
        onOpenSelector={() => setIsFindProcessesPopupOpen(true)}
        error={errors['properties.script.allowedProcessNames']}
      />
    </DesignerEditorView>
  );
}
