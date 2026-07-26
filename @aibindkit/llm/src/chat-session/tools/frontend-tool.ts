import type { ToolCall, ToolDescriptor } from '@aibindkit/core';
import { Tool, ToolContext, ToolExecutionResult } from './tool';
import { FrontendToolBus } from './frontend-tool-bus';

export class FrontendTool implements Tool {
  public constructor(
    public readonly descriptor: ToolDescriptor,
    public readonly bus: FrontendToolBus
  ) {}

  public async execute(abortSignal: AbortSignal, context: ToolContext, call: ToolCall): Promise<ToolExecutionResult> {
    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(10_000)]);
    const result = await this.bus.waitForResult(signal, context.sessionToken, call.id);
    return {
      content: result
    };
  }
}
