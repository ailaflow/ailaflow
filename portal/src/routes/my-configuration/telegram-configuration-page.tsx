import { useLoader } from '@aibindkit/react';
import type { GetMyTelegramConfigurationResponse, TelegramBotConfigurationDto } from '@aila/model';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { TelegramConfigurationView, type TelegramBotDraft } from '../../views/my-configuration/telegram-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

const availableChannels = ['default'];

export function TelegramConfigurationPage() {
  const apiClient = useApiClient();
  const loader = useLoader(abortSignal => apiClient.telegramConfiguration.get(abortSignal), [apiClient]);

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <LoadedTelegramConfigurationPage initial={loader.data} />;
}

function LoadedTelegramConfigurationPage(props: { initial: GetMyTelegramConfigurationResponse }) {
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
      await apiClient.telegramConfiguration.save(AbortSignal.timeout(10_000), {
        channelName: draft.channelName,
        botToken: draft.botToken.trim() || undefined
      });
      setBots(current => {
        const next = current.filter(bot => bot.channelName !== draft.channelName);
        next.push({ channelName: draft.channelName, hasBotToken: true });
        return next.sort((left, right) => left.channelName.localeCompare(right.channelName));
      });
      setDraft(null);
    } catch (error) {
      window.alert(`Failed to save Telegram bot: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteBot(bot: TelegramBotConfigurationDto): Promise<void> {
    if (!window.confirm(`Delete the Telegram bot binding for channel "${bot.channelName}"?`)) {
      return;
    }
    try {
      await apiClient.telegramConfiguration.delete(AbortSignal.timeout(10_000), bot.channelName);
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
      onDraftChange={delta => setDraft(current => (current ? { ...current, ...delta } : null))}
      onEditCancel={() => setDraft(null)}
      onSave={saveBot}
    />
  );
}
