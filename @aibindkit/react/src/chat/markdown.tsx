import DOMPurify, { type Config } from 'dompurify';
import { marked } from 'marked';
import { useMemo } from 'react';

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'a',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul'
  ],
  ALLOWED_ATTR: ['align', 'alt', 'href', 'src', 'start', 'title'],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false
};

export function Markdown(props: { children: string }) {
  const sanitizedHtml = useMemo(() => renderMarkdown(props.children), [props.children]);

  return <div className="abk-md" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

function renderMarkdown(markdown: string): string {
  if (!DOMPurify.isSupported) {
    return '';
  }

  const html = marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true
  });

  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
