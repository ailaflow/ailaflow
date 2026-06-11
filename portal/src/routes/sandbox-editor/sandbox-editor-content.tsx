import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useRef, useState } from 'react';
import { SandboxDto, SandboxValidator } from '@aila/model';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { SandboxEditorView, SandboxEnvVariable } from '../../views/sandbox-editor/sandbox-editor-view';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { useAiBindings } from '../common/ai-bindings/ai-bindings-context';
import { fnv1a } from '../../core/fnv1a';

interface EditorDataState {
  envVariables: SandboxEnvVariable[];
  name: string;
  description: string;
  isEnabled: boolean;
  configuration: string;
  isDirty: boolean;
}

export function SandboxEditorContent(props: { sandbox?: SandboxDto }) {
  const apiClient = useApiClient();
  const aiBindings = useAiBindings();
  const navigate = useNavigate();

  const lastEnvVariableId = useRef(0);
  const [state, setState] = useState<EditorDataState>(() => ({
    envVariables: props.sandbox
      ? Object.keys(props.sandbox.envVariables).map(key => ({
          id: lastEnvVariableId.current++,
          key,
          value: props.sandbox!.envVariables[key]
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

  useEffect(
    () =>
      aiBindings.sandboxEditor.bind({
        sandbox_editor_set_name: async arg => {
          if (isNameReadOnly) {
            return {
              error: 'Sandbox name cannot be changed.'
            };
          }
          const validationError = SandboxValidator.validateName(arg.name);
          if (validationError) {
            return { validationError };
          }
          update({ name: arg.name });
          return {
            ok: 'Sandbox name updated.'
          };
        },
        sandbox_editor_get_name: async () => {
          return {
            name: state.name
          };
        },
        sandbox_editor_get_is_enabled: async () => {
          return { isEnabled: state.isEnabled };
        },
        sandbox_editor_set_is_enabled: async arg => {
          update({ isEnabled: arg.isEnabled });
          return {
            ok: 'Sandbox enabled state updated.'
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
      await apiClient.sandbox.upsertSandbox(AbortSignal.timeout(5_000), {
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
      if (props.sandbox) {
        setState({ ...state, isDirty: false });
      } else {
        navigate(`/admin/sandboxes/${state.name}`);
      }
    } catch (e) {
      alert(`Failed to save sandbox: ${e}`);
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
