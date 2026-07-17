import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Icon } from './icon';

const SEND_ICON_PATH = 'M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z';
const STOP_ICON_PATH = 'm256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z';
const DOTS_ICON_PATH =
  'M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z';

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
            <Icon d={STOP_ICON_PATH} />
          </button>
        )}
        <button type="button" onClick={props.onSendMessage} className="abk-chat-send" aria-label="Send" title="Send">
          <Icon d={SEND_ICON_PATH} />
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
            <Icon d={DOTS_ICON_PATH} />
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
