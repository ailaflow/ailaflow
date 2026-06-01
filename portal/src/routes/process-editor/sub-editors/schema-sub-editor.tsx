import { JsonSchema } from '@aila/model';
import { useProcessEditor } from '../process-editor-context';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { useState } from 'react';
import { ProcessSubEditor } from '../../../components/process-editor/process-sub-editor';

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
    <ProcessSubEditor title={`${schema.variable.name} - Schema`} canOk={schema.isValid} onCancel={state.switchToDesigner} onOk={ok}>
      <textarea
        value={schema.schema}
        onChange={e => setSchema2(e.target.value)}
        className="h-full w-full resize-none rounded-md border border-slate-300 bg-white p-3 font-mono text-sm leading-5 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
      />
    </ProcessSubEditor>
  );
}
