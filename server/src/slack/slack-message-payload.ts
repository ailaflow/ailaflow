export interface SlackPlainTextObject {
  type: 'plain_text';
  text: string;
  emoji?: boolean;
}

export interface SlackMarkdownTextObject {
  type: 'mrkdwn';
  text: string;
}

export interface SlackMarkdownBlock {
  type: 'markdown';
  text: string;
}

export interface SlackSectionBlock {
  type: 'section';
  text: SlackMarkdownTextObject;
}

export interface SlackContextBlock {
  type: 'context';
  elements: Array<SlackPlainTextObject | SlackMarkdownTextObject>;
}

export type SlackBlock = SlackMarkdownBlock | SlackSectionBlock | SlackContextBlock;

export interface SlackMessagePayload {
  text: string;
  blocks?: SlackBlock[];
}
