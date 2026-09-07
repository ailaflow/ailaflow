import { useState } from 'react';
import { ProcessTesterChatsView } from '../../views/process-tester/process-tester-chats-view';
import { FindUserPopup } from '../common/popups/find-user-popup';
import { useProcessTester } from './process-tester-context';
import { MyChat } from '../common/my-chat/my-chat';
import { useApiClient } from '../../auth/auth-context';

export function ProcessTesterChats() {
  const apiClient = useApiClient();
  const state = useProcessTester();
  const [isFindUserPopupOpen, setIsFindUserPopupOpen] = useState(false);

  function openUserChat(userName: string) {
    state.openUserChat(userName);
    setIsFindUserPopupOpen(false);
  }

  return (
    <>
      <ProcessTesterChatsView
        userNames={state.chatUserNames}
        currentUserName={state.currentUserName}
        activeUserName={state.activeChatUserName}
        onOpenUserChat={() => setIsFindUserPopupOpen(true)}
        onSelectUser={state.selectUserChat}
        onCloseUser={state.closeUserChat}
      >
        <MyChat sessionKey={`test:${state.activeChatUserName}:default`} testUserName={state.activeChatUserName} />
      </ProcessTesterChatsView>
      {isFindUserPopupOpen && (
        <FindUserPopup
          apiClient={apiClient}
          openedUserNames={state.chatUserNames}
          onSelectUser={openUserChat}
          onClose={() => setIsFindUserPopupOpen(false)}
        />
      )}
    </>
  );
}
