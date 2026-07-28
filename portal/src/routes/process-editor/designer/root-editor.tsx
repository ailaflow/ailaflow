import { JsonSchema, ProcessDefinition, VariableDefinition } from '@aila/model';
import { useRootEditor } from 'sequential-workflow-designer-react';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { DefinitionPath } from '../../../core/definition-path';
import {
  DisabledSubValuePreviewView,
  EnabledSubValuePreviewView
} from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { SvgIcon } from '../../../views/common/svg-icons';
import { VariableSelectorPropertyView } from '../../../views/process-editor/designer-editors/variable-selector-property-view';
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
        schema: {
          schema,
          hash: '~' // Will be updated on save
        }
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
        {variables.length === 0 && (
          <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">No variables yet.</div>
        )}

        {variables.map((variable, index) => {
          const nameError: string | undefined = errors[`variables.${index}.name`];

          return (
            <div
              key={`var_${index}`}
              className={`space-y-2 rounded-md border p-3 ${nameError ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
            >
              <div className="flex items-start gap-2">
                <label
                  className={`flex h-9 min-w-0 flex-1 overflow-hidden rounded-md border bg-white ${
                    nameError ? 'border-red-300' : 'border-slate-300'
                  }`}
                >
                  <span className="inline-flex h-full w-8 shrink-0 items-center justify-center border-r border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600">
                    $
                  </span>
                  <input
                    type="text"
                    value={variable.name}
                    onChange={e => updateVariable(index, { name: e.target.value })}
                    className="h-full min-w-0 flex-1 px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    placeholder="variable_name"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeVariable(index)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white/60 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={`Remove variable ${variable.name || index + 1}`}
                  title="Remove variable"
                >
                  <SvgIcon name="x" className="h-4 w-4" />
                </button>
              </div>

              {nameError && <div className="px-1 text-xs text-red-700">{nameError}</div>}

              <label className="block space-y-1">
                <span className="px-1 text-xs text-slate-500">Description</span>
                <textarea
                  rows={1}
                  value={variable.description}
                  onChange={e => updateVariable(index, { description: e.target.value })}
                  className="min-h-9 w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="Describe this variable..."
                />
              </label>

              <EnabledSubValuePreviewView onEdit={() => editVariableSchema(index)} error={errors[`variables.${index}.schema`]}>
                Schema: <span className="font-medium text-slate-700">{(variable.schema.schema as { type: string }).type}</span>
              </EnabledSubValuePreviewView>
            </div>
          );
        })}
      </EditorPropertyView>
    </DesignerEditorView>
  );
}
