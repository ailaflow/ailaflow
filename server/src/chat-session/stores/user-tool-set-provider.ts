import { SandboxExecutorManager } from '../../managers/sandbox-executor-manager';
import { CurrentTimeTool } from '../tools/current-time-tool';
import { SandboxScriptTool } from '../tools/sandbox-script-tool';
import { ToolSet } from '../tools/tool-set';

export class UserToolSetProvider {
  public readonly hash = '0x0';
  public readonly toolSet = new ToolSet();

  public constructor(private readonly sandboxExecutorManager: SandboxExecutorManager) {
    this.toolSet.addTool(new CurrentTimeTool());
    this.toolSet.addTool(new SandboxScriptTool(this.sandboxExecutorManager));
  }
}
