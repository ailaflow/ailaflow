import { CurrentTimeTool } from '../tools/current-time-tool';
import { ToolSet } from '../tools/tool-set';

export class UserToolSetProvider {
  public readonly hash = '0x0';
  public readonly toolSet = new ToolSet();

  public constructor() {
    this.toolSet.addTool(new CurrentTimeTool());
  }
}
