import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useRef, useState } from 'react';
import { ContainerDto, ContainerValidator } from '@aila/model';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { ContainerEditorView, ContainerEnvVariable } from '../../views/container-editor/container-editor-view';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { useAiBindings } from '../common/ai-bindings/ai-bindings-context';
import { fnv1a } from '../../core/fnv1a';

interface EditorDataState {
  envVariables: ContainerEnvVariable[];
  name: string;
  description: string;
  isEnabled: boolean;
  configuration: string;
  isDirty: boolean;
}

export function ContainerEditorContent(props: { container?: ContainerDto }) {
  const apiClient = useApiClient();
  const aiBindings = useAiBindings();
  const navigate = useNavigate();

  const lastEnvVariableId = useRef(0);
  const [state, setState] = useState<EditorDataState>(() => ({
    envVariables: props.container
      ? Object.keys(props.container.envVariables).map(key => ({
          id: lastEnvVariableId.current++,
          key,
          value: props.container!.envVariables[key]
        }))
      : [],
    name: props.container?.name ?? '',
    description: props.container?.description ?? '',
    isEnabled: props.container?.isEnabled ?? true,
    configuration: props.container?.configuration ?? '',
    isDirty: false
  }));

  const isNameReadOnly = Boolean(props.container);
  const nameError = ContainerValidator.validateName(state.name);
  const descriptionError = ContainerValidator.validateDescription(state.description);
  const canSave = nameError === null && descriptionError === null && state.isDirty;

  useEffect(
    () =>
      aiBindings.containerEditor.bind({
        container_editor_set_name: async arg => {
          if (isNameReadOnly) {
            return {
              error: 'Container name cannot be changed.'
            };
          }
          const validationError = ContainerValidator.validateName(arg.name);
          if (validationError) {
            return { validationError };
          }
          update({ name: arg.name });
          return {
            ok: 'Container name updated.'
          };
        },
        container_editor_get_name: async () => {
          return {
            name: state.name
          };
        },
        container_editor_get_is_enabled: async () => {
          return { isEnabled: state.isEnabled };
        },
        container_editor_set_is_enabled: async arg => {
          update({ isEnabled: arg.isEnabled });
          return {
            ok: 'Container enabled state updated.'
          };
        }
      }),
    [aiBindings]
  );

  async function save() {
    try {
      const envVariables = state.envVariables.reduce<Record<string, string>>(
        (acc, variable) => ({ ...acc, [variable.key]: variable.value }),
        {}
      );
      await apiClient.container.upsertContainer(AbortSignal.timeout(5_000), {
        name: state.name,
        description: state.description,
        isEnabled: state.isEnabled,
        configuration: state.configuration,
        envVariables,
        hash: fnv1a({
          envVariables,
          configuration: state.configuration
        })
      });
      if (props.container) {
        setState({ ...state, isDirty: false });
      } else {
        navigate(`/admin/containers/${state.name}`);
      }
    } catch (e) {
      alert(`Failed to save container: ${e}`);
    }
  }

  function update(delta: Partial<EditorDataState>) {
    setState(state => ({ ...state, ...delta, isDirty: true }));
  }

  function onEnvVariableAdd() {
    update({
      envVariables: [
        ...state.envVariables,
        {
          id: lastEnvVariableId.current++,
          key: '',
          value: ''
        }
      ]
    });
  }

  function onEnvVariableRemove(id: number) {
    update({
      envVariables: state.envVariables.filter(variable => variable.id !== id)
    });
  }

  function onEnvVariableKeyChange(id: number, key: string) {
    update({
      envVariables: state.envVariables.map(variable => (variable.id === id ? { ...variable, key: key.toUpperCase() } : variable))
    });
  }

  function onEnvVariableValueChange(id: number, value: string) {
    update({
      envVariables: state.envVariables.map(variable => (variable.id === id ? { ...variable, value } : variable))
    });
  }

  const detailsId = 'admin-container-editor-details';

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
      <ContainerEditorView
        isEnabled={state.isEnabled}
        configuration={state.configuration}
        envVariables={state.envVariables}
        onIsEnabledChange={isEnabled => update({ isEnabled })}
        onConfigurationChange={configuration => update({ configuration })}
        onEnvVariableAdd={onEnvVariableAdd}
        onEnvVariableRemove={onEnvVariableRemove}
        onEnvVariableKeyChange={onEnvVariableKeyChange}
        onEnvVariableValueChange={onEnvVariableValueChange}
      />
    </ResourceEditorView>
  );
}
