import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useRef, useState } from 'react';
import { DockerfileContent, SandboxDto, SandboxValidator } from '@aila/model';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { SandboxEditorView, SandboxSecret } from '../../views/sandbox-editor/sandbox-editor-view';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { useAiStore } from '../common/ai-bindings/ai-bindings-context';
import { fnv1a } from '../../core/fnv1a';
import { toolError, toolSuccess } from '../common/ai-bindings/ai-tool-results';

interface EditorDataState {
  secrets: SandboxSecret[];
  name: string;
  description: string;
  isEnabled: boolean;
  configuration: string;
  isDirty: boolean;
}

export function SandboxEditorContent(props: { sandbox?: SandboxDto }) {
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const lastSecretId = useRef(0);
  const [state, setState] = useState<EditorDataState>(() => ({
    secrets: props.sandbox
      ? Object.keys(props.sandbox.secrets).map(key => ({
          id: lastSecretId.current++,
          key,
          value: props.sandbox!.secrets[key]
        }))
      : [],
    name: props.sandbox?.name ?? '',
    description: props.sandbox?.description ?? '',
    isEnabled: props.sandbox?.isEnabled ?? true,
    configuration: props.sandbox?.configuration ?? '',
    isDirty: false
  }));

  const isNameReadOnly = Boolean(props.sandbox);
  const nameError = SandboxValidator.validateName(state.name);
  const descriptionError = SandboxValidator.validateDescription(state.description);
  const canSave = nameError === null && descriptionError === null && state.isDirty;

  useAiStore(
    stores =>
      stores.sandboxEditor.bind({
        sandboxEditor_getDetails: async () => {
          return {
            name: state.name,
            description: state.description,
            isEnabled: state.isEnabled,
            configurationPrefix: DockerfileContent.prefix,
            configuration: state.configuration,
            configurationSuffix: DockerfileContent.suffix,
            secretNames: state.secrets.map(secret => secret.key)
          };
        },
        sandboxEditor_setName: async arg => {
          if (isNameReadOnly) {
            return toolError('Sandbox name cannot be changed.');
          }
          const error = SandboxValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          update({ name: arg.name });
          return toolSuccess('Updated.');
        },
        sandboxEditor_setIsEnabled: async arg => {
          update({ isEnabled: arg.isEnabled });
          return toolSuccess('Updated.');
        },
        sandboxEditor_setConfiguration: async arg => {
          update({ configuration: arg.configuration });
          return toolSuccess('Updated.');
        },
        sandboxEditor_save: async () => {
          if (!canSave) {
            return toolError('Cannot save sandbox due to validation errors or no changes made.');
          }
          await save();
          return toolSuccess('Saved.');
        }
      }),
    [isNameReadOnly, state]
  );

  async function save() {
    const secrets = state.secrets.reduce<Record<string, string>>((acc, secret) => ({ ...acc, [secret.key]: secret.value }), {});
    const abortSignal = AbortSignal.timeout(5_000);
    await apiClient.sandbox.upsertSandbox(abortSignal, {
      name: state.name,
      description: state.description,
      isEnabled: state.isEnabled,
      configuration: state.configuration,
      secrets,
      hash: fnv1a({
        secrets,
        configuration: state.configuration
      })
    });
    if (props.sandbox) {
      setState({ ...state, isDirty: false });
    } else {
      navigate(`/admin/sandboxes/${state.name}`);
    }
  }

  function update(delta: Partial<EditorDataState>) {
    setState(state => ({ ...state, ...delta, isDirty: true }));
  }

  function onSecretAdd() {
    update({
      secrets: [
        ...state.secrets,
        {
          id: lastSecretId.current++,
          key: '',
          value: ''
        }
      ]
    });
  }

  function onSecretRemove(id: number) {
    update({
      secrets: state.secrets.filter(secret => secret.id !== id)
    });
  }

  function onSecretKeyChange(id: number, key: string) {
    update({
      secrets: state.secrets.map(secret => (secret.id === id ? { ...secret, key: key.toUpperCase() } : secret))
    });
  }

  function onSecretValueChange(id: number, value: string) {
    update({
      secrets: state.secrets.map(secret => (secret.id === id ? { ...secret, value } : secret))
    });
  }

  const detailsId = 'admin-sandbox-editor-details';

  return (
    <ResourceEditorView
      icon="+"
      name={state.name}
      isNameReadOnly={isNameReadOnly}
      isNameValid={nameError === null}
      canSave={canSave}
      onSave={save}
      onNameChange={name => update({ name })}
      detailsId={detailsId}
      details={
        <ResourceSimpleDetailsView
          id={detailsId}
          description={state.description}
          descriptionError={descriptionError}
          onDescriptionChange={description => update({ description })}
        />
      }
      areDetailsVisible={true}
      canSwitch={false}
      switchLabel=""
    >
      <SandboxEditorView
        isEnabled={state.isEnabled}
        configuration={state.configuration}
        secrets={state.secrets}
        onIsEnabledChange={isEnabled => update({ isEnabled })}
        onConfigurationChange={configuration => update({ configuration })}
        onSecretAdd={onSecretAdd}
        onSecretRemove={onSecretRemove}
        onSecretKeyChange={onSecretKeyChange}
        onSecretValueChange={onSecretValueChange}
      />
    </ResourceEditorView>
  );
}
