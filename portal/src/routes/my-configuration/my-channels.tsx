import { useLoader } from '@aibindkit/react';
import { DEFAULT_CHANNEL_NAME, UserChannelValidator } from '@ailaflow/shared';
import type { MyChannelDto } from '@ailaflow/shared';
import { useRef, useState } from 'react';
import { useApiClient, useAuthState } from '../../auth/auth-context';
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
  const { apiClient, session, setSession } = useAuthState();
  const nextId = useRef(props.initialChannels.length);
  const [channels, setChannels] = useState<UserChannelDraft[]>(() =>
    props.initialChannels.map((channel, index) => createDraft(index, channel, false))
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const nameErrors = channels.map((channel, index) => getNameError(channels, channel.name, index));

  function reloadChannels() {
    if (session) {
      // TODO: this could be resolved by a dedicated mechanism.
      setSession({ ...session });
    }
  }

  function addChannel(): void {
    const id = nextId.current++;
    setChannels(current => [...current, createDraft(id, { name: '', prompt: '' }, true)]);
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

  function cancel(index: number): void {
    removeDraft(channels[index]);
  }

  async function save(index: number): Promise<void> {
    const channel = channels[index];
    if (!canSaveChannel(channel, nameErrors[index])) {
      return;
    }

    setSavingId(channel.id);
    setStatus(channel.id, null, false);
    try {
      await apiClient.myConfiguration.saveChannel(AbortSignal.timeout(10_000), {
        name: channel.name,
        prompt: channel.prompt,
        insert: channel.isNew
      });
      setChannels(current =>
        current.map(item => ({
          ...item,
          isNew: item.id === channel.id ? false : item.isNew,
          error: item.id === channel.id ? null : item.error,
          success: item.id === channel.id
        }))
      );
      reloadChannels();
    } catch (saveError) {
      setStatus(channel.id, saveError instanceof Error ? saveError.message : String(saveError), false);
    } finally {
      setSavingId(null);
    }
  }

  async function remove(index: number): Promise<void> {
    const channel = channels[index];
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
      reloadChannels();
    } catch (deleteError) {
      setStatus(channel.id, deleteError instanceof Error ? deleteError.message : String(deleteError), false);
    } finally {
      setSavingId(null);
    }
  }

  function removeDraft(channel: UserChannelDraft): void {
    setChannels(current => current.filter(item => item.id !== channel.id));
  }

  function setStatus(id: number, error: string | null, success: boolean): void {
    setChannels(current => current.map(channel => (channel.id === id ? { ...channel, error, success } : channel)));
  }

  function canSaveChannel(channel: UserChannelDraft, nameError: string | null): boolean {
    return savingId === null && nameError === null && channel.isNew;
  }

  return (
    <MyChannelsView
      channels={channels}
      nameErrors={nameErrors}
      nameReadOnly={channels.map(channel => !channel.isNew)}
      canSave={channels.map((channel, index) => canSaveChannel(channel, nameErrors[index]))}
      showRemove={channels.map(channel => !channel.isNew && channel.name !== DEFAULT_CHANNEL_NAME)}
      canRemove={channels.map(channel => !channel.isNew && channel.name !== DEFAULT_CHANNEL_NAME && savingId === null)}
      saving={channels.map(channel => channel.id === savingId)}
      errors={channels.map(channel => channel.error)}
      successes={channels.map(channel => channel.success)}
      canAdd={savingId === null}
      onAdd={addChannel}
      onChange={updateChannel}
      onCancel={cancel}
      onSave={save}
      onRemove={remove}
    />
  );
}

interface UserChannelDraft extends MyChannelDto {
  id: number;
  isNew: boolean;
  error: string | null;
  success: boolean;
}

function createDraft(id: number, channel: MyChannelDto, isNew: boolean): UserChannelDraft {
  return { ...channel, id, isNew, error: null, success: false };
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
