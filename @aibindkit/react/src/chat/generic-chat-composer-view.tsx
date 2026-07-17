import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { SvgIcon } from './svg-icon';

export interface GenericChatComposerViewProps {
  isWorking: boolean;
  message: string;
  onMessageChanged: (message: string) => void;
  onSendMessage: () => void;
  onStopClicked: () => void;
  onStartNewConversation: () => void;
}

export function GenericChatComposerView(props: GenericChatComposerViewProps) {
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
