import type { FileContent, ScriptDefinition } from '@aila/model';
import { ProcessEditorOverlayType, ProcessEditorState } from '../process-editor-context';

export interface ScriptEditorOverlayData {
  script: ScriptDefinition;
  variableNames: string[];
}

export class ScriptEditorOverlayUtils {
  public static getData(state: ProcessEditorState): ScriptEditorOverlayData {
    const v = state.getOverlayObject<ScriptDefinition>(ProcessEditorOverlayType.SCRIPT_EDITOR);
    return {
      script: v.value,
      variableNames: state.definition.value.properties.variables.map(v => v.name)
    };
  }

  public static getFileContent(data: ScriptEditorOverlayData, filePath: string): string | null {
    const content = ScriptEditorOverlayUtils.getFile(data, filePath);
    return content ? content.content : null;
  }

  public static getFile(data: ScriptEditorOverlayData, filePath: string): FileContent | undefined {
    return data.script.contents.find(c => c.path === filePath);
  }

  public static getFilePaths(data: ScriptEditorOverlayData): string[] {
    return data.script.contents.map(c => c.path);
  }

  public static setFileContent(
    data: ScriptEditorOverlayData,
    filePath: string,
    content: string,
    mode: 'edit' | 'create'
  ): 'ok' | 'fileNotFound' | 'fileAlreadyExists' {
    let c = data.script.contents.find(c => c.path === filePath);
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
        mimeType: ScriptEditorOverlayUtils.resolveMimeType(filePath),
        content: '',
        modifiedAt: 0
      };
      data.script.contents.push(c);
    } else {
      throw new Error('Unsupported mode');
    }
    c.content = content;
    c.modifiedAt = Date.now();
    return 'ok';
  }

  public static deleteFile(data: ScriptEditorOverlayData, filePath: string): boolean {
    const index = data.script.contents.findIndex(c => c.path === filePath);
    if (index < 0) {
      return false;
    }
    data.script.contents.splice(index, 1);
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
