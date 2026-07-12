import { CurrentTimeTool, Tool } from '@aibindkit/llm';

export class UserToolSetProvider {
  public readonly hash = '0x0';
  public readonly tools: Tool[] = [new CurrentTimeTool()];
}
