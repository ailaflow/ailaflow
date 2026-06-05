import { Chat } from '../../components/chat/chat';
import { PortalLayout } from '../../components/layouts/portal-layout';

export function Dashboard() {
  return (
    <PortalLayout>
      <div>
        <h1>Dashboard</h1>
        <Chat
          request={{
            user: {
              channelName: 'user_channel'
            }
          }}
        />
      </div>
    </PortalLayout>
  );
}
