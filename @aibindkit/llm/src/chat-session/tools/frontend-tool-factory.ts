import type { ToolDescriptor } from '@aibindkit/core';
import { FrontendToolBus } from './frontend-tool-bus';
import { FrontendTool } from './frontend-tool';

export class FrontendToolFactory {
  public constructor(private readonly bus: FrontendToolBus) {}

  public create(descriptor: ToolDescriptor): FrontendTool {
    return new FrontendTool(descriptor, this.bus);
  }
}
