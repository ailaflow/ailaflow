import { useNavigate, useParams } from 'react-router-dom';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { TelegramConfigurationPage } from '../common/telegram-configuration-page';

export function UserTelegramConfigurationPage() {
  const { userName } = useParams();
  const navigate = useNavigate();
  if (!userName) {
    throw new Error('User name is required');
  }

  return (
    <ResourceEditorView
      icon="@"
      name={userName}
      isNameReadOnly={true}
      isNameValid={true}
      switchLabel="Edit"
      canSwitch={true}
      onSwitch={() => navigate(`/admin/users/${encodeURIComponent(userName)}`)}
    >
      <TelegramConfigurationPage userName={userName} />
    </ResourceEditorView>
  );
}
