import { ChatTransport, Logger, SendFrontendToolResultRequest, ToolCall } from '@aibindkit/core';

export type FrontEndToolCallsHandler = (abortSignal: AbortSignal, toolCalls: ToolCall) => Promise<object | null>;

export class ChatToolCallsHandler {
  public constructor(
    private readonly transport: ChatTransport,
    private readonly frontEndToolCallsHandler: FrontEndToolCallsHandler,
    private readonly logger: Logger
  ) {}

  public async handle(abortSignal: AbortSignal, toolCalls: ToolCall[], sessionToken: string): Promise<void> {
    const resolvedIds = new Set<string>();
    try {
      const toReturn: SendFrontendToolResultRequest[] = [];
      for (const toolCall of toolCalls) {
        const result = await this.frontEndToolCallsHandler(abortSignal, toolCall);
        if (result === null) {
          // The handler has decided to not handle this tool call, so we skip it.
          resolvedIds.add(toolCall.id);
        } else {
          toReturn.push({
            sessionToken,
            callId: toolCall.id,
            result: JSON.stringify(result)
          });
        }
      }

      for (const r of toReturn) {
        await this.transport.sendFrontendToolResult(abortSignal, r);
        resolvedIds.add(r.callId);
      }
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      for (const toolCall of toolCalls) {
        if (resolvedIds.has(toolCall.id)) {
          continue;
        }
        try {
          await this.transport.sendFrontendToolResult(abortSignal, {
            sessionToken,
            callId: toolCall.id,
            result: `Error executing tool call: ${error}`
          });
        } catch (e) {
          this.logger.warn(`Failed to send frontend tool result for callId: ${toolCall.id} with error: ${(e as Error)?.message ?? e}`);
        }
      }
    }
  }
}
