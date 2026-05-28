import { CompletedMessage, ToolDescriptor } from '@aila/model';

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
