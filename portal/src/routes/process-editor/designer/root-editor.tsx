import { JsonSchema, ProcessDefinition, VariableDefinition } from '@ailaflow/model';
import { useRootEditor } from 'sequential-workflow-designer-react';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';
import { DesignerEditorView } from '../../../views/process-editor/designer/designer-editor-view';
import { EditorPropertyView } from '../../../views/process-editor/designer/editor-property-view';
import { DefinitionPath } from '../../../core/definition-path';
import { DisabledSubValuePreviewView, EnabledSubValuePreviewView } from '../../../views/process-editor/designer/sub-value-preview-view';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer/variable-selector-property-view';
import { VariableDefinitionsView } from '../../../views/process-editor/designer/variable-definitions-view';
import { createEmptyFormDefinition } from '../designer-configuration';

export interface RootEditorProps {
  state: ProcessEditorState;
}

export function RootEditor(props: RootEditorProps) {
  const { properties, definition, setProperty } = useRootEditor<ProcessDefinition>();
  const errors = props.state.rootValidator.validate(definition);
  const variables = properties.variables || [];

  function setVariables(nextVariables: VariableDefinition[]) {
    setProperty('variables', nextVariables);
  }

  function addVariable() {
    const schema: JsonSchema = {
      type: 'string'
    };
    setVariables([
      ...variables,
      {
        name: '',
        description: '',
        schema
      }
    ]);
  }

  function updateVariable(index: number, patch: Partial<VariableDefinition>) {
    setVariables(variables.map((variable, currentIndex) => (currentIndex === index ? { ...variable, ...patch } : variable)));
  }

  function removeVariable(index: number) {
    setVariables(variables.filter((_, currentIndex) => currentIndex !== index));
  }

  function editVariableSchema(index: number) {
    const path = DefinitionPath.createRootPath(`properties.variables.${index}.schema`);
    props.state.openOverlay(ProcessEditorOverlayType.SCHEMA_EDITOR, path);
  }

  function addStartForm() {
    setProperty('startForm', createEmptyFormDefinition());
  }

  function editStartFrom() {
    const path = DefinitionPath.createRootPath(`properties.startForm`);
    props.state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, path);
  }

  function removeStartForm() {
    setProperty('startForm', undefined);
  }

  return (
    <DesignerEditorView>
      <EditorPropertyView label="Start Form">
        {!properties.startForm && <DisabledSubValuePreviewView onEnable={addStartForm} label="Enable" />}
        {properties.startForm && (
          <EnabledSubValuePreviewView onEdit={editStartFrom} onRemove={removeStartForm}>
            Form
          </EnabledSubValuePreviewView>
        )}
      </EditorPropertyView>

      <VariableSelectorPropertyView
        label="Start Variables"
        variables={definition.properties.variables}
        variableNames={properties.startVariableNames}
        onChange={n => setProperty('startVariableNames', n)}
        error={errors['properties.startVariableNames']}
      />

      <EditorPropertyView label="Variables" buttons={[{ command: 'add-variable', label: 'Add' }]} onButtonClick={addVariable}>
        <VariableDefinitionsView
          variables={variables}
          errors={errors}
          onChange={updateVariable}
          onEditSchema={editVariableSchema}
          onRemove={removeVariable}
        />
      </EditorPropertyView>
    </DesignerEditorView>
  );
}
