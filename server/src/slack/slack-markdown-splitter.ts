const SLACK_MARKDOWN_MAX_LENGTH = 12_000;
const MARKDOWN_DECORATION_RESERVE = 100;
const MINIMUM_PREFERRED_CHUNK_RATIO = 0.5;

interface CodeFence {
  marker: string;
  opening: string;
}

export class SlackMarkdownSplitter {
  public split(markdown: string): string[] {
    const chunks = splitSemantically(markdown, SLACK_MARKDOWN_MAX_LENGTH - MARKDOWN_DECORATION_RESERVE);
    const result: string[] = [];
    let openFence: CodeFence | null = null;

    for (const chunk of chunks) {
      const prefix = openFence ? `${openFence.opening}\n` : '';
      openFence = updateOpenFence(openFence, chunk);
      const suffix = openFence ? `\n${openFence.marker}` : '';
      result.push(`${prefix}${chunk}${suffix}`);
    }

    return result;
  }
}

function splitSemantically(text: string, maximumLength: number): string[] {
  const remaining = Array.from(text);
  const chunks: string[] = [];
  while (remaining.length > maximumLength) {
    const window = remaining.slice(0, maximumLength).join('');
    const boundary = findBoundary(window, maximumLength);
    chunks.push(remaining.splice(0, boundary).join(''));
  }
  if (remaining.length > 0) {
    chunks.push(remaining.join(''));
  }
  return chunks;
}

function findBoundary(window: string, maximumLength: number): number {
  const minimumLength = Math.floor(maximumLength * MINIMUM_PREFERRED_CHUNK_RATIO);
  const candidates = [
    findLastIndexAfter(window, '\n\n'),
    findLastIndexAfter(window, '\n'),
    findLastSentenceEnd(window),
    findLastWhitespace(window)
  ];
  for (const candidate of candidates) {
    if (candidate >= minimumLength) {
      return Array.from(window.slice(0, candidate)).length;
    }
  }
  return maximumLength;
}

function findLastIndexAfter(text: string, separator: string): number {
  const index = text.lastIndexOf(separator);
  return index < 0 ? -1 : index + separator.length;
}

function findLastSentenceEnd(text: string): number {
  let result = -1;
  for (const match of text.matchAll(/[.!?](?:\s|$)/gu)) {
    result = (match.index ?? 0) + match[0].length;
  }
  return result;
}

function findLastWhitespace(text: string): number {
  let result = -1;
  for (const match of text.matchAll(/\s+/gu)) {
    result = (match.index ?? 0) + match[0].length;
  }
  return result;
}

function updateOpenFence(initialFence: CodeFence | null, markdown: string): CodeFence | null {
  let openFence = initialFence;
  for (const match of markdown.matchAll(/^(\s*)(`{3,}|~{3,})([^\n]*)$/gmu)) {
    const marker = match[2];
    if (!openFence) {
      openFence = { marker, opening: `${marker}${match[3]}` };
    } else if (marker[0] === openFence.marker[0] && marker.length >= openFence.marker.length) {
      openFence = null;
    }
  }
  return openFence;
}
