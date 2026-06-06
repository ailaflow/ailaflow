import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useState } from 'react';
import { AdminPortal } from '../common/admin-portal';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { ContainerEditorView } from '../../views/container-editor/container-editor-view';

export interface ContainerEditorState {
  name: string;
  isEnabled: boolean;
  description: string;
  configuration: string;
}

export function LoadedContainerEditor(props: { initialContainer: ContainerEditorState; isNew: boolean }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [container, setContainer] = useState(props.initialContainer);
  const [isDirty, setIsDirty] = useState(false);

  const isNameValid = container.name.trim().length > 0;
  const canSave = isNameValid && isDirty;

  async function save() {
    try {
      const response = await apiClient.container.upsertContainer(AbortSignal.timeout(5_000), container);
      setIsDirty(false);
      if (props.isNew) {
        navigate(`/admin/containers/${response.name}`);
      }
    } catch (e) {
      alert(`Failed to save container: ${e}`);
    }
  }

  function updateContainer(updates: Partial<ContainerEditorState>) {
    setContainer(current => ({ ...current, ...updates }));
    setIsDirty(true);
  }

  return (
    <ResourceEditorView
      icon="+"
      name={container.name}
      isNameReadOnly={!props.isNew}
      isNameValid={isNameValid}
      canSave={canSave}
      onSave={save}
      onNameChange={name => setContainer(current => ({ ...current, name }))}
      canSwitch={false}
      switchLabel=""
    >
      <ContainerEditorView
        isEnabled={container.isEnabled}
        description={container.description}
        configuration={container.configuration}
        onIsEnabledChange={isEnabled => updateContainer({ isEnabled })}
        onDescriptionChange={description => updateContainer({ description })}
        onConfigurationChange={configuration => updateContainer({ configuration })}
      />
    </ResourceEditorView>
  );
}
