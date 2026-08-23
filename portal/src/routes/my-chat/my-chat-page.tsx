import { MyChat } from '../common/my-chat/my-chat';
import { Portal } from '../common/portal';

export function MyChatPage() {
  return (
    <Portal>
      <MyChat channelName="default" />
    </Portal>
  );
}
