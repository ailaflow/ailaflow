import { ChatMessage, ChatMessageType, CompletedChatMessage } from '@aibindkit/core';

const TELEGRAM_MESSAGE_MAX_LENGTH = 4_000;

export class TelegramMessageFormatter {
  public format(message: ChatMessage): string[] {
    if (message.type !== ChatMessageType.USER && message.type !== ChatMessageType.AI) {
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
      (messageType === ChatMessageType.AI && completedMessage.message.role !== 'assistant')
    ) {
      return null;
    }

    const content = completedMessage.message.content;
    let text: string;
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter(part => 'type' in part && part.type === 'text' && 'text' in part)
        .map(part => String(part.text))
        .join('\n');
    } else {
      return null;
    }

    if (!text.trim()) {
      return null;
    }
    return messageType === ChatMessageType.USER ? `You in Aila: ${text}` : text;
  }

  private split(text: string): string[] {
    const chunks: string[] = [];
    for (let offset = 0; offset < text.length; offset += TELEGRAM_MESSAGE_MAX_LENGTH) {
      chunks.push(text.slice(offset, offset + TELEGRAM_MESSAGE_MAX_LENGTH));
    }
    return chunks;
  }
}
