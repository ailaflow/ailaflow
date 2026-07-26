import type { ToolDescriptor } from '@aibindkit/core';
import type { LlmMessage } from '@aibindkit/core';

export interface LlmCompleteResult {
  message: LlmMessage;
  totalTokens?: number;
}

export interface LlmClient {
  complete(abortSignal: AbortSignal, messages: LlmMessage[], toolDescriptors: ToolDescriptor[] | undefined): Promise<LlmCompleteResult>;
}
