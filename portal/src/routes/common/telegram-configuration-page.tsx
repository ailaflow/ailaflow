import { useLoader } from '@aibindkit/react';
import type { GetTelegramConfigurationResponse, TelegramBotConfigurationDto } from '@aila/model';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { TelegramConfigurationView, type TelegramBotDraft } from '../../views/common/telegram-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

const availableChannels = ['default'];

export function TelegramConfigurationPage(props: { userName?: string }) {
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
  return <LoadedTelegramConfigurationPage initial={loader.data} userName={props.userName} />;
}

function LoadedTelegramConfigurationPage(props: { initial: GetTelegramConfigurationResponse; userName?: string }) {
  const apiClient = useApiClient();
  const [bots, setBots] = useState(props.initial.bots);
  const [draft, setDraft] = useState<TelegramBotDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const unusedChannels = availableChannels.filter(channel => !bots.some(bot => bot.channelName === channel));

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
    if (!draft) {
      return;
    }
    setIsSaving(true);
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
      setDraft(null);
    } catch (error) {
      window.alert(`Failed to save Telegram bot: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function reconnectBot(bot: TelegramBotConfigurationDto): Promise<void> {
    if (!window.confirm(`Reconnect Telegram for channel "${bot.channelName}"? The current Telegram chat will be unlinked.`)) {
      return;
    }
    try {
      const request = { channelName: bot.channelName, reconnect: true };
      const response = props.userName
        ? await apiClient.user.saveTelegramBot(AbortSignal.timeout(10_000), props.userName, request)
        : await apiClient.telegramConfiguration.save(AbortSignal.timeout(10_000), request);
      setBots(current => current.map(item => (item.channelName === bot.channelName ? response.bot : item)));
    } catch (error) {
      window.alert(`Failed to reconnect Telegram bot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function deleteBot(bot: TelegramBotConfigurationDto): Promise<void> {
    if (!window.confirm(`Delete the Telegram bot binding for channel "${bot.channelName}"?`)) {
      return;
    }
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
    }
  }

  return (
    <TelegramConfigurationView
      bots={bots}
      availableChannels={draft?.hasBotToken ? [draft.channelName] : unusedChannels}
      draft={draft}
      canAdd={!draft && unusedChannels.length > 0}
      canSave={Boolean(draft && draft.channelName && (draft.hasBotToken || draft.botToken.trim())) && !isSaving}
      isSaving={isSaving}
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
