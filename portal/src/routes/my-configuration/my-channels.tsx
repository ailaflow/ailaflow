import { useLoader } from '@aibindkit/react';
import { UserChannelValidator } from '@ailaflow/shared';
import type { MyChannelDto } from '@ailaflow/shared';
import { useRef, useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { MyChannelsView } from '../../views/my-configuration/my-channels-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function MyChannels() {
  const apiClient = useApiClient();
  const loader = useLoader(signal => apiClient.myConfiguration.getChannels(signal), [apiClient]);

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <LoadedMyChannels initialChannels={loader.data.channels} />;
}

function LoadedMyChannels(props: { initialChannels: MyChannelDto[] }) {
  const apiClient = useApiClient();
  const nextId = useRef(props.initialChannels.length);
  const [channels, setChannels] = useState<UserChannelDraft[]>(() =>
    props.initialChannels.map((channel, index) => createDraft(index, channel, false))
  );
  const [selectedDefaultId, setSelectedDefaultId] = useState<number | null>(() => {
    const index = props.initialChannels.findIndex(channel => channel.isDefault);
    return index >= 0 ? index : null;
  });
  const [savingId, setSavingId] = useState<number | null>(null);
  const nameErrors = channels.map((channel, index) => getNameError(channels, channel.name, index));

  function addChannel(): void {
    const existingNames = new Set(channels.map(channel => channel.name));
    let name = 'channel';
    let suffix = 2;
    while (existingNames.has(name)) {
      name = `channel_${suffix}`;
      suffix++;
    }

    const id = nextId.current++;
    setChannels(current => [...current, createDraft(id, { name, prompt: '', isDefault: false }, true)]);
    if (selectedDefaultId === null) {
      setSelectedDefaultId(id);
    }
  }

  function updateChannel(index: number, delta: Partial<MyChannelDto>): void {
    setChannels(current =>
      current.map((channel, channelIndex) => {
        if (channelIndex !== index || (!channel.isNew && delta.name !== undefined)) {
          return channel;
        }
        return { ...channel, ...delta, error: null, success: false };
      })
    );
  }

  function setDefault(index: number): void {
    setSelectedDefaultId(channels[index].id);
    clearStatuses();
  }

  function reset(index: number): void {
    const channel = channels[index];
    if (channel.isNew) {
      removeDraft(channel);
      return;
    }

    setChannels(current =>
      current.map(item => (item.id === channel.id ? { ...item, prompt: item.savedPrompt, error: null, success: false } : item))
    );
    if (selectedDefaultId === channel.id && !channel.isDefault) {
      setSelectedDefaultId(channels.find(item => item.isDefault)?.id ?? null);
    }
  }

  async function save(index: number): Promise<void> {
    const channel = channels[index];
    if (!canSaveChannel(channel, nameErrors[index])) {
      return;
    }

    const isSelectedDefault = channel.id === selectedDefaultId;
    const isChangingDefault = isSelectedDefault && !channel.isDefault;
    const isDefault = channel.isDefault || isSelectedDefault;
    setSavingId(channel.id);
    setStatus(channel.id, null, false);
    try {
      await apiClient.myConfiguration.saveChannel(AbortSignal.timeout(10_000), {
        name: channel.name,
        prompt: channel.prompt,
        isDefault,
        insert: channel.isNew
      });
      setChannels(current =>
        current.map(item => ({
          ...item,
          isDefault: isChangingDefault ? item.id === channel.id : item.isDefault,
          isNew: item.id === channel.id ? false : item.isNew,
          savedPrompt: item.id === channel.id ? item.prompt : item.savedPrompt,
          error: item.id === channel.id ? null : item.error,
          success: item.id === channel.id
        }))
      );
    } catch (saveError) {
      setStatus(channel.id, saveError instanceof Error ? saveError.message : String(saveError), false);
    } finally {
      setSavingId(null);
    }
  }

  async function remove(index: number): Promise<void> {
    const channel = channels[index];
    if (channel.isDefault || channel.id === selectedDefaultId) {
      return;
    }
    if (channel.isNew) {
      removeDraft(channel);
      return;
    }
    if (!window.confirm(`Delete channel "${channel.name}"?`)) {
      return;
    }

    setSavingId(channel.id);
    setStatus(channel.id, null, false);
    try {
      await apiClient.myConfiguration.deleteChannel(AbortSignal.timeout(10_000), channel.name);
      setChannels(current => current.filter(item => item.id !== channel.id));
    } catch (deleteError) {
      setStatus(channel.id, deleteError instanceof Error ? deleteError.message : String(deleteError), false);
    } finally {
      setSavingId(null);
    }
  }

  function removeDraft(channel: UserChannelDraft): void {
    setChannels(current => current.filter(item => item.id !== channel.id));
    if (selectedDefaultId === channel.id) {
      setSelectedDefaultId(channels.find(item => item.isDefault)?.id ?? null);
    }
  }

  function clearStatuses(): void {
    setChannels(current => current.map(channel => ({ ...channel, error: null, success: false })));
  }

  function setStatus(id: number, error: string | null, success: boolean): void {
    setChannels(current => current.map(channel => (channel.id === id ? { ...channel, error, success } : channel)));
  }

  function canSaveChannel(channel: UserChannelDraft, nameError: string | null): boolean {
    const becomingDefault = channel.id === selectedDefaultId && !channel.isDefault;
    return savingId === null && nameError === null && (channel.isNew || channel.prompt !== channel.savedPrompt || becomingDefault);
  }

  return (
    <MyChannelsView
      channels={channels.map(channel => ({ ...channel, isDefault: channel.id === selectedDefaultId }))}
      nameErrors={nameErrors}
      nameReadOnly={channels.map(channel => !channel.isNew)}
      canSave={channels.map((channel, index) => canSaveChannel(channel, nameErrors[index]))}
      canReset={channels.map(
        channel => channel.isNew || channel.prompt !== channel.savedPrompt || (channel.id === selectedDefaultId && !channel.isDefault)
      )}
      canRemove={channels.map(channel => !channel.isNew && !channel.isDefault && channel.id !== selectedDefaultId && savingId === null)}
      saving={channels.map(channel => channel.id === savingId)}
      errors={channels.map(channel => channel.error)}
      successes={channels.map(channel => channel.success)}
      canAdd={savingId === null}
      onAdd={addChannel}
      onChange={updateChannel}
      onSetDefault={setDefault}
      onReset={reset}
      onSave={save}
      onRemove={remove}
    />
  );
}

interface UserChannelDraft extends MyChannelDto {
  id: number;
  isNew: boolean;
  savedPrompt: string;
  error: string | null;
  success: boolean;
}

function createDraft(id: number, channel: MyChannelDto, isNew: boolean): UserChannelDraft {
  return { ...channel, id, isNew, savedPrompt: channel.prompt, error: null, success: false };
}

function getNameError(channels: MyChannelDto[], name: string, index: number): string | null {
  const validationError = UserChannelValidator.validateName(name);
  if (validationError) {
    return validationError;
  }
  if (channels.some((channel, channelIndex) => channelIndex !== index && channel.name === name)) {
    return 'Channel names must be unique';
  }
  return null;
}
