import type { ToolDescriptor } from '@aibindkit/core';
import type { CompletedMessage } from '@aibindkit/core';

export interface CompleteResult {
  completedMessage: CompletedMessage;
  totalTokens?: number;
}

export interface LlmClient {
  complete(
    abortSignal: AbortSignal,
    completedMessages: CompletedMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<CompleteResult>;
}
