import { join } from 'node:path';
import fs from 'node:fs/promises';
import { Process } from '../repositories/process/process';
import { DefinitionWalker } from 'sequential-workflow-model';
import { DockerfileContent, ProcessDefinition, ScriptDefinition, ScriptStep } from '@aila/model';
import { Sandbox } from '../repositories/sandbox/sandbox';
import { SandboxHostPaths } from './sandbox-host-paths';
import { Logger } from '../core/logger';

async function tryRead(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

export class SandboxMaterializer {
  private readonly walker = new DefinitionWalker();
  private readonly logger = new Logger(SandboxMaterializer.name);

  public constructor(private readonly paths: SandboxHostPaths) {}

  public async tryMaterializeSandbox(abortSignal: AbortSignal, sandbox: Sandbox): Promise<boolean> {
    const versionPath = join(this.paths.appFolderAbsolutePath, 'version');
    if ((await tryRead(versionPath)) === sandbox.hash) {
      return false;
    }

    const dockerfileContent = DockerfileContent.build(sandbox.configuration);
    await fs.mkdir(this.paths.appFolderAbsolutePath, { recursive: true });
    await fs.mkdir(this.paths.dataFolderAbsolutePath, { recursive: true });
    await fs.writeFile(this.paths.dockerfileAbsolutePath, dockerfileContent);
    await fs.writeFile(versionPath, sandbox.hash);

    abortSignal.throwIfAborted();
    this.logger.log(`Materialized sandbox ${sandbox.name} in sandbox ${this.paths.sandboxName}`);
    return true;
  }

  public async tryBeginMaterializationOfProcess(abortSignal: AbortSignal, process: Process): Promise<null | (() => Promise<void>)> {
    const processFolder = join(this.paths.appFolderAbsolutePath, process.name);
    const processVersionPath = join(processFolder, 'version');
    if ((await tryRead(processVersionPath)) === process.hash) {
      return null;
    }

    await fs.mkdir(processFolder, { recursive: true });
    abortSignal.throwIfAborted();

    const scriptMap = this.readScripts(process.definition);
    for (const [stepId, script] of scriptMap.entries()) {
      const stepFolderPath = join(processFolder, stepId);
      const stepVersionPath = join(stepFolderPath, 'version');
      if ((await tryRead(stepVersionPath)) === script.hash) {
        continue;
      }

      await fs.mkdir(stepFolderPath, { recursive: true });

      for (const content of script.contents) {
        const contentPath = join(stepFolderPath, content.path);
        await fs.writeFile(contentPath, content.content);
        abortSignal.throwIfAborted();
      }

      await fs.writeFile(stepVersionPath, script.hash);
    }

    const packageJsonPath = join(processFolder, 'package.json');
    const pnpmWorkspaceYamlPath = join(processFolder, 'pnpm-workspace.yaml');
    await fs.writeFile(packageJsonPath, this.createPackageJsonContent(process));
    await fs.writeFile(pnpmWorkspaceYamlPath, this.createPnpmWorkspaceYamlContent(scriptMap));

    return async () => {
      await fs.writeFile(processVersionPath, process.hash);
    };
  }

  private readScripts(definition: ProcessDefinition): Map<string, ScriptDefinition> {
    const scripts = new Map<string, ScriptDefinition>();
    this.walker.forEach(definition, step => {
      if (step.type === 'script') {
        const scriptStep = step as ScriptStep;
        scripts.set(scriptStep.id, scriptStep.properties.script);
      }
    });
    return scripts;
  }

  private createPackageJsonContent(process: Process): string {
    return JSON.stringify({
      name: `aila_process_${process.name}`,
      version: '1.0.0'
    });
  }

  private createPnpmWorkspaceYamlContent(scriptMap: Map<string, ScriptDefinition>): string {
    let content = 'packages:\n';
    for (const stepId of scriptMap.keys()) {
      content += `  - ./${stepId}\n`;
    }
    return content;
  }
}
