import { ChatMessage, ChatMessageType, CompletedChatMessage, LlmMessageContentExtractor } from '@aibindkit/core';

const TELEGRAM_MESSAGE_MAX_LENGTH = 4_000;

export class TelegramMessageFormatter {
  public format(message: ChatMessage): string[] {
    if (message.failReason !== undefined) {
      return this.split(`Failed: ${message.failReason || 'Unknown error'}`);
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

    return (message.completedMessages ?? []).flatMap(completedMessage => {
      const text = this.getText(message.type, completedMessage);
      return text === null ? [] : this.split(text);
    });
  }

  private getText(messageType: ChatMessageType, completedMessage: CompletedChatMessage): string | null {
    if (completedMessage.metadata?.['internal'] === true) {
      return null;
    }
    if (
      (messageType === ChatMessageType.USER && completedMessage.message.role !== 'user') ||
      (messageType === ChatMessageType.ASSISTANT && completedMessage.message.role !== 'assistant')
    ) {
      return null;
    }

    const text = LlmMessageContentExtractor.tryExtract(completedMessage.message)?.content;
    if (!text?.trim()) {
      return null;
    }
    return messageType === ChatMessageType.USER ? `You in AilaFlow: ${text}` : text;
  }

  private split(text: string): string[] {
    const chunks: string[] = [];
    for (let offset = 0; offset < text.length; offset += TELEGRAM_MESSAGE_MAX_LENGTH) {
      chunks.push(text.slice(offset, offset + TELEGRAM_MESSAGE_MAX_LENGTH));
    }
    return chunks;
  }
}
