import type { ToolDescriptor } from '@aibindkit/core';
import { Tool } from './tool';

export class ToolSet {
  private readonly toolMap = new Map<string, Tool>();
  private cache: ToolDescriptor[] | null = null;

  public addTool(tool: Tool) {
    this.toolMap.set(tool.descriptor.function.name, tool);
    this.cache = null;
  }

  public tryGetTool(name: string): Tool | undefined {
    return this.toolMap.get(name);
  }

  public getDescriptorsOrUndefined(): ToolDescriptor[] | undefined {
    if (this.toolMap.size === 0) {
      return undefined;
    }
    if (!this.cache) {
      this.cache = [...this.toolMap.values()].map(tool => tool.descriptor);
    }
    return this.cache;
  }
}
