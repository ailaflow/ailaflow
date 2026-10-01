import { useParams } from 'react-router';
import { MyChat } from '../common/my-chat/my-chat';

export function MyChatPage() {
  const { channelName } = useParams();
  const sessionKey = `user:${channelName}`;

  return <MyChat sessionKey={sessionKey} />;
}
