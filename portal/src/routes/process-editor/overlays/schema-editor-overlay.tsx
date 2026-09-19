import type { JsonSchema } from '@ailaflow/shared';
import { ProcessEditorOverlayType, useProcessEditor } from '../process-editor-context';
import { useState } from 'react';
import { wrapDefinition } from 'sequential-workflow-designer-react';
import { ProcessOverlayView } from '../../../views/process-editor/overlays/process-overlay-view';
import { SvgIcon } from '../../../views/common/svg-icons';
import { DefinitionPath } from '../../../core/definition-path';
import { SchemaOverlayView } from '../../../views/process-editor/overlays/schema-overlay-view';

export function SchemaEditorOverlay() {
  const state = useProcessEditor();

  const [data, setData] = useState(() => {
    const { value, isRoot, parent, pathParts } = state.getOverlayObject<JsonSchema>(ProcessEditorOverlayType.SCHEMA_EDITOR);
    if (isRoot) {
      const index = Number(pathParts[pathParts.length - 2]);
      const name = parent.properties.variables[index].name;
      return {
        schema: JSON.stringify(value, null, 2),
        title: `$${name} - Schema Editor`,
        isValid: true
      };
    }
    throw new Error('Invalid schema editor overlay state');
  });

  function setSchema(newSchema: string) {
    let isValid = true;
    try {
      JSON.parse(newSchema);
    } catch (e) {
      isValid = false;
    }
    setData({
      ...data,
      schema: newSchema,
      isValid
    });
    state.setDefinition(wrapDefinition(state.definition.value), true);
  }

  function ok() {
    let newSchema: JsonSchema;
    try {
      newSchema = JSON.parse(data.schema) as JsonSchema;
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
      title={data.title}
      isOkVisible={state.isDirty}
      isOkEnabled={state.isDirty && data.isValid}
      closeContent={state.isDirty ? 'Cancel' : <SvgIcon name="x" className="h-4 w-4" />}
      closeAriaLabel={state.isDirty ? 'Cancel' : 'Back to designer'}
      onClose={state.closeOverlay}
      onOk={ok}
    >
      <SchemaOverlayView schema={data.schema} onSchemaChange={setSchema} />
    </ProcessOverlayView>
  );
}
