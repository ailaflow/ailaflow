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

  public static getFileContent(data: ScriptChildEditorData, filePath: string): string | null {
    const content = data.form.contents.find(c => c.path === filePath);
    return content ? content.content : null;
  }

  public static setFileContent(
    data: ScriptChildEditorData,
    filePath: string,
    content: string,
    mode: 'edit' | 'create'
  ): 'ok' | 'fileNotFound' | 'fileAlreadyExists' {
    let c = data.form.contents.find(c => c.path === filePath);
    if (mode === 'edit') {
      if (!c) {
        return 'fileNotFound';
      }
    } else if (mode === 'create') {
      if (c) {
        return 'fileAlreadyExists';
      }
      c = {
        path: filePath,
        mimeType: ScriptChildEditorUtils.resolveMimeType(filePath),
        content: '',
        modifiedAt: 0
      };
    } else {
      throw new Error('Unsupported mode');
    }
    c.content = content;
    c.modifiedAt = Date.now();
    return 'ok';
  }

  public static deleteFile(data: ScriptChildEditorData, filePath: string): boolean {
    const index = data.form.contents.findIndex(c => c.path === filePath);
    if (index < 0) {
      return false;
    }
    data.form.contents.splice(index, 1);
    return true;
  }

  public static resolveMimeType(path: string) {
    if (path.endsWith('.json')) {
      return 'application/json';
    }
    if (path.endsWith('.ts')) {
      return 'text/typescript';
    }
    if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
      return 'text/javascript';
    }
    return 'text/plain';
  }
}
