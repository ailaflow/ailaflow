import { useLoader } from '@aibindkit/react';
import type { GetTelegramConfigurationResponse, TelegramBotConfigurationDto } from '@ailaflow/model';
import { useEffect, useRef, useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { TelegramConfigurationView, type TelegramBotDraft } from '../../views/common/telegram-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

const availableChannels = ['default'];

export interface TelegramConfigurationProps {
  userName?: string;
  onIsDirtyChange?: (isDirty: boolean) => void;
}

export function TelegramConfiguration(props: TelegramConfigurationProps) {
  const apiClient = useApiClient();
  const loader = useLoader(
    abortSignal =>
      props.userName
        ? apiClient.user.getTelegramConfiguration(abortSignal, props.userName)
        : apiClient.telegramConfiguration.get(abortSignal),
    [apiClient, props.userName]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <LoadedTelegramConfiguration initial={loader.data} userName={props.userName} onIsDirtyChange={props.onIsDirtyChange} />;
}

function LoadedTelegramConfiguration(props: TelegramConfigurationProps & { initial: GetTelegramConfigurationResponse }) {
  const apiClient = useApiClient();
  const [bots, setBots] = useState(props.initial.bots);
  const [draft, setDraft] = useState<TelegramBotDraft | null>(null);
  const isSavingRef = useRef(false);
  const isDirty = draft !== null;
  const unusedChannels = availableChannels.filter(channel => !bots.some(bot => bot.channelName === channel));

  useEffect(() => {
    props.onIsDirtyChange?.(isDirty);
  }, [props.onIsDirtyChange, isDirty]);

  function addBot(): void {
    const channelName = unusedChannels[0];
    if (channelName) {
      setDraft({ channelName, botToken: '', hasBotToken: false });
    }
  }

  function editBot(bot: TelegramBotConfigurationDto): void {
    setDraft({ channelName: bot.channelName, botToken: '', hasBotToken: bot.hasBotToken });
  }

  async function saveBot(): Promise<void> {
    if (!draft || isSavingRef.current) {
      return;
    }
    isSavingRef.current = true;
    try {
      const request = {
        channelName: draft.channelName,
        botToken: draft.botToken.trim() || undefined
      };
      const response = props.userName
        ? await apiClient.user.saveTelegramBot(AbortSignal.timeout(10_000), props.userName, request)
        : await apiClient.telegramConfiguration.save(AbortSignal.timeout(10_000), request);
      setBots(current => {
        const next = current.filter(bot => bot.channelName !== draft.channelName);
        next.push(response.bot);
        return next.sort((left, right) => left.channelName.localeCompare(right.channelName));
      });
      setDraft(current => (current === draft ? null : current));
    } catch (error) {
      window.alert(`Failed to save Telegram bot: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isSavingRef.current = false;
    }
  }

  async function reconnectBot(bot: TelegramBotConfigurationDto): Promise<void> {
    if (isSavingRef.current) {
      return;
    }
    if (!window.confirm(`Reconnect Telegram for channel "${bot.channelName}"? The current Telegram chat will be unlinked.`)) {
      return;
    }
    isSavingRef.current = true;
    try {
      const request = { channelName: bot.channelName, reconnect: true };
      const response = props.userName
        ? await apiClient.user.saveTelegramBot(AbortSignal.timeout(10_000), props.userName, request)
        : await apiClient.telegramConfiguration.save(AbortSignal.timeout(10_000), request);
      setBots(current => current.map(item => (item.channelName === bot.channelName ? response.bot : item)));
    } catch (error) {
      window.alert(`Failed to reconnect Telegram bot: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isSavingRef.current = false;
    }
  }

  async function deleteBot(bot: TelegramBotConfigurationDto): Promise<void> {
    if (isSavingRef.current) {
      return;
    }
    if (!window.confirm(`Delete the Telegram bot binding for channel "${bot.channelName}"?`)) {
      return;
    }
    isSavingRef.current = true;
    try {
      if (props.userName) {
        await apiClient.user.deleteTelegramBot(AbortSignal.timeout(10_000), props.userName, bot.channelName);
      } else {
        await apiClient.telegramConfiguration.delete(AbortSignal.timeout(10_000), bot.channelName);
      }
      setBots(current => current.filter(item => item.channelName !== bot.channelName));
      setDraft(current => (current?.channelName === bot.channelName ? null : current));
    } catch (error) {
      window.alert(`Failed to delete Telegram bot: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isSavingRef.current = false;
    }
  }

  return (
    <TelegramConfigurationView
      bots={bots}
      availableChannels={draft?.hasBotToken ? [draft.channelName] : unusedChannels}
      draft={draft}
      canAdd={!draft && unusedChannels.length > 0}
      canSave={Boolean(draft && draft.channelName && (draft.hasBotToken || draft.botToken.trim()))}
      onAdd={addBot}
      onEdit={editBot}
      onDelete={deleteBot}
      onReconnect={reconnectBot}
      onDraftChange={delta => setDraft(current => (current ? { ...current, ...delta } : null))}
      onEditCancel={() => setDraft(null)}
      onSave={saveBot}
    />
  );
}
