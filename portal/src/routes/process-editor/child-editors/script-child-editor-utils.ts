import { ScriptDefinition } from '@aila/model';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';

export interface ScriptChildEditorData {
  form: ScriptDefinition;
  variableNames: string[];
}

export class ScriptChildEditorUtils {
  public static getData(state: ProcessEditorState): ScriptChildEditorData {
    const v = state.getOverlayObject<ScriptDefinition>(ProcessEditorOverlayType.SCRIPT_EDITOR);
    return {
      form: v.value,
      variableNames: state.definition.value.properties.variables.map(v => v.name)
    };
  }
}
