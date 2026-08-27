import { JsonSchema } from '@aila/model';
import { ProcessEditorOverlayType, useProcessEditor } from '../process-editor-context';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { useState } from 'react';
import { ProcessOverlayView } from '../../../views/process-editor/overlays/process-overlay-view';
import { SvgIcon } from '../../../views/common/svg-icons';

export function SchemaEditorOverlay() {
  const state = useProcessEditor();

  const [schema, setSchema] = useState(() => {
    const { value: s } = state.getOverlayObject<JsonSchema>(ProcessEditorOverlayType.SCHEMA_EDITOR);
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
        hash: '~' // Will be updated on save
      };
    } catch (e) {
      return;
    }

    const { value } = state.getOverlayObject<JsonSchema>(ProcessEditorOverlayType.SCHEMA_EDITOR);
    Object.assign(value, newSchema);
    state.setDefinition(wrapDefinition(state.definition.value), true);
    state.closeOverlay();
  }

  return (
    <ProcessOverlayView
      title="Schema"
      isOkVisible={state.isDirty}
      isOkEnabled={state.isDirty && schema.isValid}
      closeContent={state.isDirty ? 'Cancel' : <SvgIcon name="x" className="h-4 w-4" />}
      closeAriaLabel={state.isDirty ? 'Cancel' : 'Back to designer'}
      onClose={state.closeOverlay}
      onOk={ok}
    >
      <textarea
        value={schema.schema}
        onChange={e => setSchema2(e.target.value)}
        className="h-full w-full resize-none rounded-md border border-slate-300 bg-white p-3 font-mono text-sm leading-5 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400"
      />
    </ProcessOverlayView>
  );
}
