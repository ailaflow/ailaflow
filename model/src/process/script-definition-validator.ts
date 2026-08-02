import { ScriptDefinition } from './script-definition';

export class ScriptDefinitionValidator {
  public static validate(script: ScriptDefinition): string | null {
    const pkgJson = script.contents.find(content => content.path === 'package.json');
    if (!pkgJson) {
      return 'Script must contain a package.json file.';
    }

    let pkgJsonContent: {
      dependencies?: Record<string, string>;
    };
    try {
      pkgJsonContent = JSON.parse(pkgJson.content);
    } catch (e) {
      return 'package.json is not a valid JSON file.';
    }

    const ailaDep = pkgJsonContent.dependencies?.['@aila/bridge-lib'];
    if (ailaDep !== 'file:/bridge/lib') {
      return 'package.json must have a dependency on @aila/bridge-lib with version file:/bridge/lib.';
    }

    return null;
  }
}
