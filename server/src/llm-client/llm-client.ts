import type { ToolDescriptor } from '@aibindkit/model';
import { CompletedMessage } from '@aila/model';

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
