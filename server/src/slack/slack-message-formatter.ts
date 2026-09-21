import { ChatMessage, ChatMessageType, CompletedChatMessage, LlmMessageContentExtractor } from '@aibindkit/core';

const SLACK_MESSAGE_MAX_LENGTH = 4_000;

export class SlackMessageFormatter {
  public format(message: ChatMessage): string[] {
    if (message.failReason !== undefined) {
      return splitUnicodeSafe(`Failed: ${message.failReason || 'Unknown error'}`);
    }
    if (message.isInterrupted) {
      return ['Interrupted.'];
    }
    if (message.type === ChatMessageType.COMPACT) {
      return ['Context compacted.'];
    }
    if (message.type !== ChatMessageType.USER && message.type !== ChatMessageType.ASSISTANT) {
      return [];
    }
    return (message.completedMessages ?? []).flatMap(completed => {
      const text = this.getText(message.type, completed);
      return text === null ? [] : splitUnicodeSafe(text);
    });
  }

  private getText(messageType: ChatMessageType, completed: CompletedChatMessage): string | null {
    if (completed.metadata?.['internal'] === true) {
      return null;
    }
    if (
      (messageType === ChatMessageType.USER && completed.message.role !== 'user') ||
      (messageType === ChatMessageType.ASSISTANT && completed.message.role !== 'assistant')
    ) {
      return null;
    }
    const text = LlmMessageContentExtractor.tryExtract(completed.message)?.content;
    if (!text?.trim()) {
      return null;
    }
    return messageType === ChatMessageType.USER ? `You in AilaFlow: ${text}` : text;
  }
}

function splitUnicodeSafe(text: string): string[] {
  const codePoints = Array.from(text);
  const chunks: string[] = [];
  for (let offset = 0; offset < codePoints.length; offset += SLACK_MESSAGE_MAX_LENGTH) {
    chunks.push(codePoints.slice(offset, offset + SLACK_MESSAGE_MAX_LENGTH).join(''));
  }
  return chunks;
}
