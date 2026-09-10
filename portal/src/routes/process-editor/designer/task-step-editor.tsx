import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StepEditorProps } from './step-editor';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { ProcessDefinition, TaskCompletionPolicy, TaskStep } from '@ailaflow/shared';
import { EditorPropertyView } from '../../../views/process-editor/designer/editor-property-view';
import { EnabledSubValuePreviewView } from '../../../views/process-editor/designer/sub-value-preview-view';
import { DefinitionPath } from '../../../core/definition-path';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer/variable-selector-property-view';
import { ProcessEditorOverlayType } from '../process-editor-context';
import { StringOrVariablePropertyView } from '../../../views/process-editor/designer/string-or-variable-property-view';
import { DropdownPropertyView } from '../../../views/process-editor/designer/dropdown-property-view';
import { VariableNamePropertyView } from '../../../views/process-editor/designer/variable-name-property-view';

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

      <StringOrVariablePropertyView
        label="Deadline (UTC Format)"
        optional
        value={properties.deadline}
        variables={definition.properties.variables}
        onValueChanged={value => setProperty('deadline', value)}
        error={errors['properties.deadline']}
      />

      <DropdownPropertyView<TaskCompletionPolicy>
        label="Completion Policy"
        value={properties.completionPolicy}
        options={[
          { label: 'All assignees', value: TaskCompletionPolicy.ALL_ASSIGNEES },
          { label: 'Any assignee', value: TaskCompletionPolicy.ANY_ASSIGNEE }
        ]}
        onValueChanged={value => setProperty('completionPolicy', value)}
        error={errors['properties.completionPolicy']}
      />
    </DesignerEditorView>
  );
}
