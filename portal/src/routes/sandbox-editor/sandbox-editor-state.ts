import { SandboxDto, SandboxValidator, UpsertSandboxRequest } from '@aila/model';
import { useMemo, useRef, useState } from 'react';
import { SandboxSecret } from '../../views/sandbox-editor/sandbox-editor-view';

export interface SandboxEditorData {
  secrets: SandboxSecret[];
  name: string;
  description: string;
  isEnabled: boolean;
  configuration: string;
  isDirty: boolean;
  isNew: boolean;
}

export interface SandboxEditorState extends SandboxEditorData {
  nameError: string | null;
  descriptionError: string | null;
  canSave: boolean;
  setName(name: string): void;
  setDescription(description: string): void;
  setIsEnabled(isEnabled: boolean): void;
  setConfiguration(configuration: string): void;
  addSecret(): void;
  removeSecret(id: number): void;
  setSecretKey(id: number, key: string): void;
  setSecretValue(id: number, value: string): void;
  getSecretNames(): string[];
  markSaved(): void;
  toUpsertRequest(): UpsertSandboxRequest;
}

export function useSandboxEditorState(sandbox?: SandboxDto): SandboxEditorState {
  const lastSecretId = useRef(0);
  const [data, setData] = useState<SandboxEditorData>(() => createData(sandbox, lastSecretId));
  const validation = useMemo(() => validateState(data), [data]);
  const { nameError, descriptionError } = validation;
  const canSave = data.isDirty && nameError === null && descriptionError === null;

  function update(delta: Partial<SandboxEditorData> | ((data: SandboxEditorData) => Partial<SandboxEditorData>)) {
    setData(data => ({
      ...data,
      ...(typeof delta === 'function' ? delta(data) : delta),
      isDirty: true
    }));
  }

  return {
    ...data,
    nameError,
    descriptionError,
    canSave,
    setName: name => update({ name }),
    setDescription: description => update({ description }),
    setIsEnabled: isEnabled => update({ isEnabled }),
    setConfiguration: configuration => update({ configuration }),
    addSecret: () =>
      update(data => ({
        secrets: [
          ...data.secrets,
          {
            id: lastSecretId.current++,
            key: '',
            value: ''
          }
        ]
      })),
    removeSecret: id =>
      update(data => ({
        secrets: data.secrets.filter(secret => secret.id !== id)
      })),
    setSecretKey: (id, key) =>
      update(data => ({
        secrets: data.secrets.map(secret => (secret.id === id ? { ...secret, key: key.toUpperCase() } : secret))
      })),
    setSecretValue: (id, value) =>
      update(data => ({
        secrets: data.secrets.map(secret => (secret.id === id ? { ...secret, value } : secret))
      })),
    getSecretNames: () => data.secrets.map(secret => secret.key),
    markSaved: () =>
      setData(data => ({
        ...data,
        isDirty: false
      })),
    toUpsertRequest: () => ({
      name: data.name,
      description: data.description,
      isEnabled: data.isEnabled,
      configuration: data.configuration,
      secrets: secretsToRecord(data.secrets)
    })
  };
}

function createData(sandbox: SandboxDto | undefined, lastSecretId: { current: number }): SandboxEditorData {
  return {
    secrets: Object.entries(sandbox?.secrets ?? {}).map(([key, value]) => ({
      id: lastSecretId.current++,
      key,
      value
    })),
    name: sandbox?.name ?? '',
    description: sandbox?.description ?? '',
    isEnabled: sandbox?.isEnabled ?? true,
    configuration: sandbox?.configuration ?? '',
    isDirty: !sandbox,
    isNew: !sandbox
  };
}

function validateState(state: SandboxEditorData): { nameError: string | null; descriptionError: string | null } {
  return {
    nameError: SandboxValidator.validateName(state.name),
    descriptionError: SandboxValidator.validateDescription(state.description)
  };
}

function secretsToRecord(secrets: SandboxSecret[]): Record<string, string> {
  return secrets.reduce<Record<string, string>>((acc, secret) => ({ ...acc, [secret.key]: secret.value }), {});
}
