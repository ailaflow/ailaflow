import { useState } from 'react';
import { ProcessTesterChatsView } from '../../views/process-tester/process-tester-chats-view';
import { FindUserPopup } from './find-user-popup';
import { useProcessTester } from './process-tester-context';
import { MyChat } from '../common/my-chat/my-chat';

export function ProcessTesterChats() {
  const state = useProcessTester();
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  function openUserChat(userName: string) {
    state.openUserChat(userName);
    setIsUserSearchOpen(false);
  }

  return (
    <>
      <ProcessTesterChatsView
        userNames={state.chatUserNames}
        currentUserName={state.currentUserName}
        activeUserName={state.activeChatUserName}
        onOpenUserChat={() => setIsUserSearchOpen(true)}
        onSelectUser={state.selectUserChat}
        onCloseUser={state.closeUserChat}
      >
        <MyChat sessionKey={`test:${state.activeChatUserName}`} />
      </ProcessTesterChatsView>
      {isUserSearchOpen && <FindUserPopup onSelectUser={openUserChat} onClose={() => setIsUserSearchOpen(false)} />}
    </>
  );
}
