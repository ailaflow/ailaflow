import { JsonSchema } from '@aila/model';
import { useProcessEditor } from './process-editor-context';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { useState } from 'react';

export function SchemaSubEditor() {
  const state = useProcessEditor();
  const path = state.path;
  if (!path) {
    throw new Error('Path is required');
  }

  const index = Number(path.split('.', 2)[1]);
  const [schema, setSchema] = useState(() => {
    const variable = state.definition.value.properties.variables[index];

    return {
      variable,
      schema: JSON.stringify(variable.schema, null, 2),
      isValid: true
    };
  });

  function setSchema2(newSchema: string) {
    let isValid = true;
    try {
      JSON.parse(newSchema);
    } catch (e) {
      isValid = false;
    }
    setSchema({
      ...schema,
      schema: newSchema,
      isValid
    });
  }

  function ok() {
    let newSchema: JsonSchema;
    try {
      newSchema = JSON.parse(schema.schema);
    } catch (e) {
      return;
    }

    const newDefinition = {
      ...state.definition.value,
      properties: {
        ...state.definition.value.properties,
        variables: state.definition.value.properties.variables.map((variable, currentIndex) =>
          currentIndex === index ? { ...variable, schema: newSchema } : variable
        )
      }
    };
    state.setDefinition(wrapDefinition(newDefinition));
    state.switchToDesigner();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 text-2xl font-semibold text-slate-800">${schema.variable.name} - Schema</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={state.switchToDesigner}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!schema.isValid}
              onClick={ok}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-white disabled:hover:bg-slate-300"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-5">
        <textarea
          value={schema.schema}
          onChange={e => setSchema2(e.target.value)}
          className="h-full w-full resize-none rounded-md border border-slate-300 bg-white p-3 font-mono text-sm leading-5 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
        />
      </div>
    </div>
  );
}
