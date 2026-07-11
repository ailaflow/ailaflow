import { CurrentTimeTool, ToolSet } from '@aibindkit/llm';

export class UserToolSetProvider {
  public readonly hash = '0x0';
  public readonly toolSet = new ToolSet();

  public constructor() {
    this.toolSet.addTool(new CurrentTimeTool());
  }
}
