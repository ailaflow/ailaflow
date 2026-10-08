import { ChatMessage, ChatMessageType, CompletedChatMessage, LlmMessageContentExtractor } from '@aibindkit/core';
import type { FormLinkMessage } from '../magic-link/form-link-message-generator';
import { MagicLinkStatus } from '../magic-link/magic-link-generator';
import { SlackMarkdownSplitter } from './slack-markdown-splitter';
import type { SlackMessagePayload } from './slack-message-payload';

export class SlackMessageFormatter {
  public constructor(private readonly markdownSplitter = new SlackMarkdownSplitter()) {}

  public format(message: ChatMessage): SlackMessagePayload[] {
    if (message.failReason !== undefined) {
      const reason = message.failReason || 'Unknown error';
      return [createMarkdownPayload(`⚠️ **Request failed**\n\n${reason}`)];
    }
    if (message.isInterrupted) {
      return [createContextPayload('⏹️ Request interrupted.')];
    }
    if (message.type === ChatMessageType.COMPACT) {
      return [createContextPayload('🧹 Conversation context compacted.')];
    }
    if (message.type !== ChatMessageType.USER && message.type !== ChatMessageType.ASSISTANT) {
      return [];
    }
    return (message.completedMessages ?? []).flatMap(completed => {
      const text = this.getText(message.type, completed);
      if (text === null) {
        return [];
      }
      return this.markdownSplitter.split(text).map(chunk =>
        message.type === ChatMessageType.USER
          ? {
              ...createMarkdownPayload(chunk),
              blocks: [
                { type: 'context', elements: [{ type: 'plain_text', text: '🌐 Sent from AilaFlow', emoji: true }] },
                { type: 'markdown', text: chunk }
              ]
            }
          : createMarkdownPayload(chunk)
      );
    });
  }

  public formatFormLink(message: FormLinkMessage): SlackMessagePayload {
    let markdown: string;
    switch (message.result.status) {
      case MagicLinkStatus.SUCCESS: {
        markdown = `### 💼 ${message.title}\n[Open ${message.title.toLowerCase()}](${message.result.url})\n\n_This secure link expires in ${message.validityHours} hours._`;
        break;
      }
      case MagicLinkStatus.NOT_CONFIGURED: {
        markdown = `### ⚠️ ${message.title}\nThe public URL is not configured. Please notify your administrator.`;
        break;
      }
      case MagicLinkStatus.FAILURE: {
        markdown = `### ⚠️ ${message.title}\nForm link generation failed.`;
        break;
      }
    }
    return createMarkdownPayload(markdown);
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
    return text;
  }
}

function createMarkdownPayload(markdown: string): SlackMessagePayload {
  return {
    text: toPlainText(markdown),
    blocks: [{ type: 'markdown', text: markdown }]
  };
}

function createContextPayload(text: string): SlackMessagePayload {
  return {
    text,
    blocks: [{ type: 'context', elements: [{ type: 'plain_text', text, emoji: true }] }]
  };
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/^\s*```[^\n]*$/gmu, '')
    .replace(/^\s*~~~[^\n]*$/gmu, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, '$1: $2')
    .replace(/^#{1,6}\s+/gmu, '')
    .replace(/(\*\*|__|~~|`)/gu, '')
    .replace(/^_([^_\n]+)_$/gmu, '$1')
    .trim();
}
