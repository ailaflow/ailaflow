import type { LlmMessage } from '@aibindkit/core';

/**
 * TODO: this is a temporary solution.
 */
export class LlmMessageSanitizer {
  public sanitize(messages: LlmMessage[]): LlmMessage[] {
    return messages.map(message => {
      if (message.role !== 'assistant') {
        return message;
      }
      const sanitized = { ...message } as typeof message & Record<string, unknown>;
      delete sanitized.codexThreadId;
      return sanitized;
    });
  }
}
