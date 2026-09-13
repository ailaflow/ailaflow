import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { ProcessDefinition, TaskFinalizationPolicy, TaskDeadlinePreset, TaskStep } from '@ailaflow/shared';
import { EditorPropertyView } from '../../../views/process-editor/designer/editor-property-view';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer/sub-value-preview-view';
import { DefinitionPath } from '../../../core/definition-path';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer/variable-selector-property-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { StringOrVariablePropertyView } from '../../../views/process-editor/designer/string-or-variable-property-view';
import { DropdownPropertyView } from '../../../views/process-editor/designer/dropdown-property-view';
import { VariableNamePropertyView } from '../../../views/process-editor/designer/variable-name-property-view';
import { DropdownOrVariablePropertyView } from '../../../views/process-editor/designer/dropdown-or-variable-property-view';

export function TaskStepEditor(props: StepEditorProps) {
  const { id, name, step, properties, definition, setName, setProperty } = useStepEditor<TaskStep, ProcessDefinition>();
  const errors = props.state.stepValidator.validate(step, definition);

  function editForm() {
    const path = DefinitionPath.createStepPath(id, `properties.form`);
    props.state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, path);
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']}></StringEditorPropertyView>

      <StringOrVariablePropertyView
        label="Title"
        value={properties.title}
        variables={definition.properties.variables}
        onValueChanged={v => setProperty('title', v)}
        error={errors['properties.title']}
      />

      <EditorPropertyView label="Form">
        <EnabledSubValuePreviewView onEdit={editForm}>Form</EnabledSubValuePreviewView>
      </EditorPropertyView>

      <VariableSelectorPropertyView
        label="Input Variables"
        variables={definition.properties.variables}
        variableNames={properties.inputVariableNames}
        onChange={n => setProperty('inputVariableNames', n)}
        error={errors['properties.inputVariableNames']}
      />

      <VariableSelectorPropertyView
        label="Output Variables"
        variables={definition.properties.variables}
        variableNames={properties.outputVariableNames}
        onChange={n => setProperty('outputVariableNames', n)}
        error={errors['properties.outputVariableNames']}
      />

      <StringOrVariablePropertyView
        label="User Expression"
        value={properties.userExpression}
        variables={definition.properties.variables}
        onValueChanged={v => setProperty('userExpression', v)}
        error={errors['properties.userExpression']}
      />

      <VariableNamePropertyView
        label="Metadata Variable"
        value={properties.metadataVariableName ?? ''}
        variables={definition.properties.variables}
        onValueChanged={value => setProperty('metadataVariableName', value === '' ? undefined : value)}
        error={errors['properties.metadataVariableName']}
      />

      <DropdownOrVariablePropertyView
        label="Deadline"
        optional
        value={properties.deadline}
        variables={definition.properties.variables}
        options={[
          { label: '1 minute', value: TaskDeadlinePreset.ONE_MINUTE },
          { label: '5 minutes', value: TaskDeadlinePreset.FIVE_MINUTES },
          { label: '10 minutes', value: TaskDeadlinePreset.TEN_MINUTES },
          { label: '30 minutes', value: TaskDeadlinePreset.THIRTY_MINUTES },
          { label: '1 hour', value: TaskDeadlinePreset.ONE_HOUR },
          { label: '1 day', value: TaskDeadlinePreset.ONE_DAY }
        ]}
        onValueChanged={value => setProperty('deadline', value)}
        error={errors['properties.deadline']}
      />

      <DropdownPropertyView<TaskFinalizationPolicy>
        label="Finalization Policy"
        value={properties.finalizationPolicy}
        options={[
          { label: 'After all assigned tasks are completed', value: TaskFinalizationPolicy.ALL_ASSIGNEES },
          { label: 'After any assigned task is completed', value: TaskFinalizationPolicy.ANY_ASSIGNEE }
        ]}
        onValueChanged={value => setProperty('finalizationPolicy', value)}
        error={errors['properties.finalizationPolicy']}
      />
    </DesignerEditorView>
  );
}
