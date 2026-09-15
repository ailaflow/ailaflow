import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { cssLanguage } from '@codemirror/lang-css';
import { htmlLanguage } from '@codemirror/lang-html';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { jsonLanguage } from '@codemirror/lang-json';
import { defaultHighlightStyle, syntaxHighlighting, type LRLanguage } from '@codemirror/language';
import { EditorView, keymap } from '@codemirror/view';
import { useEffect, useRef } from 'react';

export type CodeMirrorLanguage = 'css' | 'html' | 'javascript' | 'json';

export interface CodeMirrorProps {
  value: string;
  language?: CodeMirrorLanguage;
  filePath?: string;
  ariaLabel: string;
  onChange: (value: string) => void;
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '0.875rem'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    lineHeight: '1.5rem'
  },
  '.cm-content': {
    padding: '1rem 0',
    caretColor: '#0f172a'
  },
  '.cm-line': {
    padding: '0 1rem'
  }
});

export function CodeMirror(props: CodeMirrorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView>(null);
  const isApplyingExternalChangeRef = useRef(false);
  const onChangeRef = useRef(props.onChange);
  onChangeRef.current = props.onChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const language = getLanguage(props.language, props.filePath);
    const editor = new EditorView({
      parent: container,
      doc: props.value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': props.ariaLabel }),
        EditorView.updateListener.of(update => {
          if (update.docChanged && !isApplyingExternalChangeRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        editorTheme,
        ...(language ? [language] : [])
      ]
    });
    editorRef.current = editor;

    return () => {
      editor.destroy();
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [props.ariaLabel, props.filePath, props.language]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.state.doc.toString() === props.value) {
      return;
    }

    isApplyingExternalChangeRef.current = true;
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: props.value
      }
    });
    isApplyingExternalChangeRef.current = false;
  }, [props.value]);

  return <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden bg-white" />;
}

function getLanguage(language: CodeMirrorLanguage | undefined, filePath: string | undefined): LRLanguage | undefined {
  const resolvedLanguage = language ?? getLanguageFromFilePath(filePath);
  if (resolvedLanguage === 'html') {
    return htmlLanguage;
  }
  if (resolvedLanguage === 'javascript') {
    return javascriptLanguage;
  }
  if (resolvedLanguage === 'css') {
    return cssLanguage;
  }
  if (resolvedLanguage === 'json') {
    return jsonLanguage;
  }
  return undefined;
}

function getLanguageFromFilePath(filePath: string | undefined): CodeMirrorLanguage | undefined {
  const extension = filePath?.split('.').pop()?.toLowerCase();
  if (extension === 'html' || extension === 'htm') {
    return 'html';
  }
  if (extension === 'js' || extension === 'mjs' || extension === 'cjs') {
    return 'javascript';
  }
  if (extension === 'css') {
    return 'css';
  }
  if (extension === 'json') {
    return 'json';
  }
  return undefined;
}
