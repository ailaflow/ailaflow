import type { ToolDescriptor } from '@aibindkit/core';
import { Tool } from './tool';

export class ToolSet {
  private readonly toolMap = new Map<string, Tool>();

  public addTool(tool: Tool) {
    this.toolMap.set(tool.descriptor.function.name, tool);
  }

  public tryGetTool(name: string): Tool | undefined {
    return this.toolMap.get(name);
  }

  public getDescriptorsOrUndefined(): ToolDescriptor[] | undefined {
    return this.toolMap.size > 0 ? [...this.toolMap.values()].map(tool => tool.descriptor) : undefined;
  }
}
