import { ChatMessageType } from '@aibindkit/core';
import { ChatMessageMetadata } from '@aibindkit/core';
import { Chat } from '@aibindkit/react';
import { useState } from 'react';
import { useApiClient, useSession } from '../../../auth/auth-context';
import type { MyProcessStartFormArgs } from '../my-form/my-process-start-form';
import type { MyTaskFormArgs } from '../my-form/my-task-form';
import { MyProcessStartFormPopup } from '../popups/my-process-start-form-popup';
import { MyTaskFormPopup } from '../popups/my-task-form-popup';
import { messageRenderer } from './message-renderer';

interface MyChatPopupState {
  myProcess?: MyProcessStartFormArgs;
  myTask?: MyTaskFormArgs;
}

function messageFilter(type: ChatMessageType, metadata?: ChatMessageMetadata) {
  if (type === ChatMessageType.SYSTEM) {
    return false;
  }
  if (metadata?.['internal'] === true) {
    return false;
  }
  return true;
}

export interface MyChatProps {
  sessionKey: string;
  testUserName?: string;
}

export function MyChat(props: MyChatProps) {
  const session = useSession();
  const apiClient = useApiClient();
  const [popup, setPopup] = useState<MyChatPopupState>({});

  function closePopup(): void {
    setPopup({});
  }

  return (
    <>
      <Chat
        assistantName="Aila"
        userName={`@${props.testUserName ?? session.userName}`}
        transport={apiClient.chat}
        sessionKey={props.sessionKey}
        emptyTitle="Hello I’m Aila"
        emptyText="What would you like to do?"
        messageFilter={messageFilter}
        messageRenderer={(id, _, completedMessage, completedMessageIndex, sessionToken) =>
          messageRenderer(
            {
              openProcessStartForm: myProcess => setPopup({ myProcess }),
              openTaskForm: myTask => setPopup({ myTask })
            },
            id,
            completedMessage,
            completedMessageIndex,
            sessionToken,
            props.testUserName
          )
        }
      />
      {popup.myProcess ? <MyProcessStartFormPopup args={popup.myProcess} onEnded={closePopup} onClose={closePopup} /> : null}
      {popup.myTask ? <MyTaskFormPopup args={popup.myTask} onClose={closePopup} /> : null}
    </>
  );
}
