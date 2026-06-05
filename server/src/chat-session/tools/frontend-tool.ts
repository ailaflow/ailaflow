import { ToolCall, ToolDescriptor } from '@aila/model';
import { Tool } from './tool';
import { FrontendToolBus } from './frontend-tool-bus';

export class FrontendTool implements Tool {
  public constructor(
    public readonly descriptor: ToolDescriptor,
    public readonly bus: FrontendToolBus
  ) {}

  public async execute(abortSignal: AbortSignal, call: ToolCall): Promise<string> {
    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(30_000)]);
    return this.bus.waitForResult(signal, call.id);
  }
}
