import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { ConfigurationOverviewView } from '../../views/configuration/configuration-overview-view';
import type { ConfigurationStatus } from '../../views/configuration/configuration-overview-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function MyConfigurationOverview() {
  const apiClient = useApiClient();
  const loader = useLoader(abortSignal => apiClient.telegramConfiguration.get(abortSignal), [apiClient]);

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  const configuredBotCount = loader.data.bots.filter(bot => bot.hasBotToken).length;
  const telegramConfigured = configuredBotCount > 0;
  const statuses: ConfigurationStatus[] = [
    {
      id: 'telegram',
      label: 'Telegram',
      value: telegramConfigured ? `Configured · ${configuredBotCount} ${configuredBotCount === 1 ? 'bot' : 'bots'}` : 'Not configured',
      isHealthy: telegramConfigured,
      remediation: 'Configure a Telegram bot to chat with Aila through Telegram.',
      action: { label: 'Configure Telegram', href: '/my-configuration?tab=telegram' }
    }
  ];

  return <ConfigurationOverviewView title="Configuration status" statuses={statuses} />;
}
