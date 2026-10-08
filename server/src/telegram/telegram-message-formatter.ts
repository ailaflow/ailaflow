import { ChatMessage, ChatMessageType, CompletedChatMessage, LlmMessageContentExtractor } from '@aibindkit/core';
import type { FormLinkMessage } from '../magic-link/form-link-message-generator';
import { MagicLinkStatus } from '../magic-link/magic-link-generator';

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

  public formatFormLink(message: FormLinkMessage): string {
    let content: string;
    switch (message.result.status) {
      case MagicLinkStatus.SUCCESS: {
        content = `Please click here: ${message.result.url}\nValid for ${message.validityHours} hours.`;
        break;
      }
      case MagicLinkStatus.NOT_CONFIGURED: {
        content = 'The public URL is not configured. Please notify your administrator.';
        break;
      }
      case MagicLinkStatus.FAILURE: {
        content = 'Form link generation failed.';
        break;
      }
    }
    return `─── 💼 ${message.title} ────\n${content}\n──────────────\n`;
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
