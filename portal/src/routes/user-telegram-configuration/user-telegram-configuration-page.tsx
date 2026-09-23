import { useState } from 'react';
import { useParams } from 'react-router';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { TelegramConfiguration } from '../common/telegram-configuration';
import { useUnsavedChangesController } from '../common/admin-portal';

export function UserTelegramConfigurationPage() {
  const { userName } = useParams();
  if (!userName) {
    throw new Error('User name is required');
  }

  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesController(isDirty);

  return (
    <ResourceEditorView
      icon="@"
      name={userName}
      isNameReadOnly={true}
      isNameValid={true}
      viewSwitcherOptions={[
        { label: 'Editor', href: `/admin/users/${userName}` },
        { label: 'Telegram', href: `/admin/users/${userName}/telegram`, selected: true }
      ]}
      viewSwitcherDisabledReason={isDirty ? 'Please save changes' : undefined}
    >
      <TelegramConfiguration key={userName} userName={userName} onIsDirtyChange={setIsDirty} />
    </ResourceEditorView>
  );
}
