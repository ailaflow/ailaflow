import type { ToolDescriptor } from '@aibindkit/model';
import type { CompletedMessage } from '@aibindkit/model';

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
