import { ProcessDefinition, ProcessDefinitionValidator, VariableDefinition } from '@aila/model';
import { useRootEditor } from 'sequential-workflow-designer-react';
import { ProcessEditorState } from '../process-editor-context';
import { DesignerEditorView } from '../../../views/process-editor/designer-editors/designer-editor-view';
import { SubValuePreviewView } from '../../../views/process-editor/designer-editors/sub-value-preview-view';
import { EditorPropertyView } from '../../../views/process-editor/designer-editors/editor-property-view';
import { DefinitionPath } from '../../../core/definition-path';

export interface RootEditorProps {
  editorState: ProcessEditorState;
}

export function RootEditor(props: RootEditorProps) {
  const { properties, setProperty } = useRootEditor<ProcessDefinition>();
  const validationErrors = ProcessDefinitionValidator.validate(properties);
  const variables = properties.variables || [];

  function setVariables(nextVariables: VariableDefinition[]) {
    setProperty('variables', nextVariables);
  }

  function addVariable() {
    setVariables([
      ...variables,
      {
        name: '',
        description: '',
        input: true,
        output: false,
        schema: {
          type: 'string'
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
    props.editorState.switchToSchemaEditor(path);
  }

  function editInputFrom() {
    const path = DefinitionPath.createRootPath(`properties.inputForm`);
    props.editorState.switchToFormEditor(path);
  }

  function editOutputFrom() {
    const path = DefinitionPath.createRootPath(`properties.outputForm`);
    props.editorState.switchToFormEditor(path);
  }

  return (
    <DesignerEditorView>
      <EditorPropertyView label="Input Form">
        <SubValuePreviewView onEdit={editInputFrom}>Form is not defined</SubValuePreviewView>
      </EditorPropertyView>

      <EditorPropertyView label="Output Form">
        <SubValuePreviewView onEdit={editOutputFrom}>Form is not defined</SubValuePreviewView>
      </EditorPropertyView>

      <EditorPropertyView label="Variables" buttons={[{ command: 'add-variable', label: 'Add' }]} onButtonClick={addVariable}>
        {variables.length === 0 && (
          <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">No variables yet.</div>
        )}

        {variables.map((variable, index) => {
          const nameError: string | undefined = validationErrors[`variables.${index}.name`];

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
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  Remove
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

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-8 items-center gap-2 rounded-md px-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={variable.input}
                    onChange={e => updateVariable(index, { input: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Input
                </label>

                <label className="inline-flex h-8 items-center gap-2 rounded-md px-1 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={variable.output}
                    onChange={e => updateVariable(index, { output: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Output
                </label>
              </div>

              <SubValuePreviewView onEdit={() => editVariableSchema(index)}>
                Schema: <span className="font-medium text-slate-700">{variable.schema.type}</span>
              </SubValuePreviewView>
            </div>
          );
        })}
      </EditorPropertyView>
    </DesignerEditorView>
  );
}
