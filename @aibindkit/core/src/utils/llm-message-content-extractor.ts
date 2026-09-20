import { LlmMessage } from '../chat-session';

export interface LlmMessageContent {
  content?: string;
  reasoning?: string;
}

export class LlmMessageContentExtractor {
  public static tryExtract(message: LlmMessage): LlmMessageContent | null {
    let content: string | undefined = undefined;
    let reasoning: string | undefined = undefined;

    if (message.content) {
      if (typeof message.content === 'string' && message.content.length > 0) {
        content = message.content;
      } else if (Array.isArray(message.content) && message.content?.[0].type === 'text') {
        content = message.content[0].text;
      }
    }
    if (message.role === 'assistant') {
      const m = message as any;
      for (const fieldName of ['reasoning', 'reasoning_content']) {
        const value = m[fieldName];
        if (typeof value === 'string' && value.length > 0) {
          reasoning = value;
        }
      }
    }
    if (content || reasoning) {
      return { content, reasoning };
    }
    return null;
  }
}
