import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { ConfigurationOverviewView } from '../../views/configuration/configuration-overview-view';
import { SlackConnectionStatus } from '@ailaflow/shared';
import type { ConfigurationStatus } from '../../views/configuration/configuration-overview-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function MyConfigurationOverview() {
  const apiClient = useApiClient();
  const loader = useLoader(
    async signal => {
      const [telegram, slack] = await Promise.all([
        apiClient.myConfiguration.getTelegramConfiguration(signal),
        apiClient.myConfiguration.getSlackConfiguration(signal)
      ]);
      return { telegram, slack };
    },
    [apiClient]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  const configuredBotCount = loader.data.telegram.bots.filter(bot => bot.hasBotToken).length;
  const telegramConfigured = configuredBotCount > 0;
  const statuses: ConfigurationStatus[] = [
    {
      id: 'telegram',
      label: 'Telegram',
      value: telegramConfigured ? `Configured · ${configuredBotCount} ${configuredBotCount === 1 ? 'bot' : 'bots'}` : 'Not configured',
      isHealthy: telegramConfigured,
      remediation: 'Configure a Telegram bot to chat with Aila through Telegram.',
      action: { label: 'Configure Telegram', href: '/my-configuration?tab=telegram' }
    },
    {
      id: 'slack',
      label: 'Slack',
      value:
        loader.data.slack.status === SlackConnectionStatus.CONNECTED
          ? 'Connected'
          : loader.data.slack.status === SlackConnectionStatus.UNAVAILABLE
            ? 'Unavailable'
            : 'Not connected',
      isHealthy: loader.data.slack.status === SlackConnectionStatus.CONNECTED,
      remediation:
        loader.data.slack.status === SlackConnectionStatus.UNAVAILABLE
          ? 'Contact your administrator about the unavailable Slack integration.'
          : 'Contact your administrator to map your Slack account.',
      action: { label: 'View Slack status', href: '/my-configuration?tab=slack' }
    }
  ];

  return (
    <ConfigurationOverviewView
      title="Your configuration status"
      description="Below, you can see the status of your configuration."
      statuses={statuses}
    />
  );
}
