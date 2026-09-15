import { BranchStep, ProcessDefinition } from '@ailaflow/shared';
import { useStepEditor } from 'sequential-workflow-designer-react';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { StringEditorPropertyView } from '../../../views/process-editor/designer/string-editor-property-view';
import { VariableNamePropertyView } from '../../../views/process-editor/designer/variable-name-property-view';
import { BranchesPropertyView } from '../../../views/process-editor/designer/branches-property-view';
import { StepEditorProps } from './step-editor';

export function BranchStepEditor(props: StepEditorProps) {
  const { name, step, properties, definition, setName, setProperty, notifyChildrenChanged } = useStepEditor<
    BranchStep,
    ProcessDefinition
  >();
  const errors = props.state.stepValidator.validate(step, definition);
  const stringVariables = definition.properties.variables.filter(variable => variable.schema.type === 'string');
  const branchNames = Object.keys(step.branches);

  function addBranch(branchName: string) {
    if (step.branches[branchName]) {
      return;
    }
    step.branches[branchName] = [];
    notifyChildrenChanged();
  }

  function deleteBranch(branchName: string) {
    if (branchNames.length <= 1) {
      return;
    }
    delete step.branches[branchName];
    notifyChildrenChanged();
  }

  return (
    <DesignerEditorView>
      <StringEditorPropertyView label="Name" value={name} onValueChanged={setName} error={errors['name']} />

      <VariableNamePropertyView
        label="Branch Selector Variable"
        value={properties.branchSelectorVariableName}
        variables={stringVariables}
        onValueChanged={value => setProperty('branchSelectorVariableName', value)}
        error={errors['properties.branchSelectorVariableName']}
      />

      <BranchesPropertyView branchNames={branchNames} onAdd={addBranch} onDelete={deleteBranch} />
    </DesignerEditorView>
  );
}
