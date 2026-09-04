import { JsonSchema } from '@aila/model';
import { ProcessEditorOverlayType, useProcessEditor } from '../process-editor-context';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { useState } from 'react';
import { ProcessOverlayView } from '../../../views/process-editor/overlays/process-overlay-view';
import { SvgIcon } from '../../../views/common/svg-icons';
import { DefinitionPath } from '../../../core/definition-path';

export function SchemaEditorOverlay() {
  const state = useProcessEditor();

  const [schema, setSchema] = useState(() => {
    const { value: s } = state.getOverlayObject<JsonSchema>(ProcessEditorOverlayType.SCHEMA_EDITOR);
    return {
      schema: JSON.stringify(s, null, 2),
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
      newSchema = JSON.parse(schema.schema) as JsonSchema;
    } catch (e) {
      return;
    }

    if (!state.overlay) {
      throw new Error('Schema editor overlay is not open');
    }
    DefinitionPath.writePath(state.definition.value, state.overlay.path, newSchema);
    state.notifyDefinitionChange();
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
