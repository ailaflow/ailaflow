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
      } else if (Array.isArray(message.content)) {
        const parts: string[] = [];
        for (const m of message.content) {
          if (m.type === 'text' && m.text && m.text.length > 0) {
            parts.push(m.text);
          }
        }
        if (parts.length > 0) {
          content = parts.join('\n');
        }
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
