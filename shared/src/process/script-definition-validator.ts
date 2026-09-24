import { FileContent, ScriptDefinition } from './script-definition';

const FILE_PATH_REGEXP = /^(?:[\w-]+\/)*[\w-]+\.[\w-]+$/;

export class ScriptDefinitionValidator {
  public static validatePath(path: string): string | null {
    return FILE_PATH_REGEXP.test(path) ? null : `File path "${path}" contains forbidden characters`;
  }

  public static validate(script: ScriptDefinition): string | null {
    let pkgJson: FileContent | null = null;

    for (const content of script.contents) {
      if (content.path === 'package.json') {
        pkgJson = content;
      } else {
        const pathError = this.validatePath(content.path);
        if (pathError) {
          return pathError;
        }
      }
    }

    if (!pkgJson) {
      return 'Script must contain a package.json file';
    }

    let pkgJsonContent: {
      dependencies?: Record<string, string>;
    };
    try {
      pkgJsonContent = JSON.parse(pkgJson.content);
    } catch (e) {
      return 'package.json is not a valid JSON file';
    }

    const ailaflowDependency = pkgJsonContent.dependencies?.['@ailaflow/bridge-lib'];
    if (ailaflowDependency !== 'file:/bridge/lib') {
      return 'package.json must have a dependency on @ailaflow/bridge-lib with version file:/bridge/lib';
    }

    return null;
  }
}
