import { JsonSchema } from '@aila/model';
import { useProcessEditor } from '../process-editor-context';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { useState } from 'react';
import { ProcessSubEditorView } from '../../../views/process-editor/process-sub-editor-view';
import { DefinitionPath } from '../../../core/definition-path';
import { fnv1a } from '../../../core/fnv1a';

export function SchemaSubEditor() {
  const state = useProcessEditor();

  const [schema, setSchema] = useState(() => {
    const { value: s } = DefinitionPath.readPath<JsonSchema>(state.definition.value, state.childPath!);
    return {
      schema: JSON.stringify(s.schema, null, 2),
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
      const s = JSON.parse(schema.schema);
      newSchema = {
        schema: s,
        hash: fnv1a(s)
      };
    } catch (e) {
      return;
    }

    const newDefinition = {
      ...state.definition.value
    };
    DefinitionPath.writePath(newDefinition, state.childPath!, newSchema);
    state.setDefinition(wrapDefinition(newDefinition), true);
    state.switchToDesigner();
  }

  return (
    <ProcessSubEditorView title={`Schema`} canOk={schema.isValid} onCancel={state.switchToDesigner} onOk={ok}>
      <textarea
        value={schema.schema}
        onChange={e => setSchema2(e.target.value)}
        className="h-full w-full resize-none rounded-md border border-slate-300 bg-white p-3 font-mono text-sm leading-5 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
      />
    </ProcessSubEditorView>
  );
}
