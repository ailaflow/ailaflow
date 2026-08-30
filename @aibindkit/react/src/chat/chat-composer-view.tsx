import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ChatContextUsageUpdate } from '@aibindkit/core';
import { SvgIcon } from './svg-icon';

export interface ChatComposerViewProps {
  isWorking: boolean;
  message: string;
  contextUsage?: ChatContextUsageUpdate;
  onMessageChanged: (message: string) => void;
  onSendMessage: () => void;
  onStopClicked: () => void;
  onStartNewConversation: () => void;
}

export function ChatComposerView(props: ChatComposerViewProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  function onMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.ctrlKey) {
      return;
    }

    event.preventDefault();
    props.onSendMessage();
  }

  function onStartNewConversationClicked() {
    setIsMenuOpen(false);
    props.onStartNewConversation();
  }

  const contextPercent = Math.min(100, Math.max(0, props.contextUsage?.percent ?? 0));

  return (
    <div className="abk-chat-composer">
      <div className="abk-chat-composer-inner">
        <textarea
          value={props.message}
          onChange={e => props.onMessageChanged(e.currentTarget.value)}
          onKeyDown={onMessageKeyDown}
          rows={1}
          placeholder="Type a message..."
          className="abk-chat-input"
        />
        {props.isWorking && (
          <button type="button" onClick={props.onStopClicked} className="abk-chat-send" aria-label="Stop" title="Stop">
            <SvgIcon name="stop" />
          </button>
        )}
        <button type="button" onClick={props.onSendMessage} className="abk-chat-send" aria-label="Send" title="Send">
          <SvgIcon name="send" />
        </button>
        <div ref={menuRef} className="abk-chat-menu">
          <button
            type="button"
            className="abk-chat-menu-button"
            aria-label="Chat options"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(open => !open)}
          >
            <SvgIcon name="dots" />
          </button>
          {isMenuOpen && (
            <div role="menu" className="abk-chat-menu-panel">
              <div role="none" className="abk-chat-menu-context">
                <div className="abk-chat-menu-context-header">
                  <span>Context usage</span>
                  <strong>{Math.round(contextPercent)}%</strong>
                </div>
                {props.contextUsage?.totalTokens !== undefined && props.contextUsage.contextWindow !== undefined && (
                  <div className="abk-chat-menu-context-tokens">
                    {props.contextUsage.totalTokens.toString()} / {props.contextUsage.contextWindow.toString()}
                  </div>
                )}
                <div
                  role="progressbar"
                  aria-label="Context usage"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(contextPercent)}
                  className="abk-chat-menu-context-progress"
                >
                  <span style={{ width: `${contextPercent}%` }} />
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                disabled={props.isWorking}
                className="abk-chat-menu-item"
                onClick={onStartNewConversationClicked}
              >
                Start new conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
