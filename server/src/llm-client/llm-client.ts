import { CompletedMessage } from './types/completed-message';
import { ToolDescriptor } from './types/tool-descriptor';

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
