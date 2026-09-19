import type { JsonSchema } from '@ailaflow/shared';
import { ProcessEditorOverlayType, useProcessEditor } from '../process-editor-context';
import { useState } from 'react';
import { ProcessOverlayView } from '../../../views/process-editor/overlays/process-overlay-view';
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
        title: `$${name} - JSON Schema Editor`,
        isValid: true
      };
    }
    throw new Error('Invalid schema editor overlay state');
  });

  function setSchema(newSchema: string) {
    if (!state.overlay) {
      throw new Error('Invalid state');
    }

    let json: object | undefined = undefined;
    try {
      json = JSON.parse(newSchema);
    } catch {
      // Ignore
    }
    const isValid = Boolean(json);
    setData({
      ...data,
      schema: newSchema,
      isValid
    });
    if (json) {
      DefinitionPath.writePath(state.definition.value, state.overlay.path, json);
      state.notifyDefinitionChange();
    }
  }

  return (
    <ProcessOverlayView title={data.title} canClose={data.isValid} onClose={state.closeOverlay}>
      <SchemaOverlayView schema={data.schema} onSchemaChange={setSchema} />
    </ProcessOverlayView>
  );
}
