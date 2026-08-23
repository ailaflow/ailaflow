import { MyChat } from '../common/my-chat/my-chat';
import { Portal } from '../common/portal';

const SESSION_KEY = 'user:default';

export function MyChatPage() {
  return (
    <Portal>
      <MyChat sessionKey={SESSION_KEY} />
    </Portal>
  );
}
