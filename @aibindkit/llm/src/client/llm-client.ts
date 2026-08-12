import type { LlmCompletionUsage, ToolDescriptor } from '@aibindkit/core';
import type { LlmMessage } from '@aibindkit/core';

export interface LlmCompleteResult {
  message: LlmMessage;
  usage?: LlmCompletionUsage;
}

export interface LlmModelSettings {
  name: string;
}

export class LlmClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = LlmClientError.name;
  }
}

export interface LlmClient {
  complete(
    abortSignal: AbortSignal,
    modelSettings: LlmModelSettings,
    messages: LlmMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<LlmCompleteResult>;
  getModels(abortSignal: AbortSignal): Promise<string[]>;
}
