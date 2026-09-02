import { useLoader } from '@aibindkit/react';
import { LlmProviderPolicy, LlmUseCase } from '@aila/model';
import type { GetLlmConfigurationResponse } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { ConfigurationOverviewView } from '../../views/configuration/configuration-overview-view';
import type { ConfigurationStatus } from '../../views/configuration/configuration-overview-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function ConfigurationOverviewPage() {
  const apiClient = useApiClient();
  const loader = useLoader(
    async abortSignal => {
      const [host, llm, publicUrlTest] = await Promise.all([
        apiClient.sandbox.diagnoseHost(abortSignal),
        apiClient.llmConfiguration.get(abortSignal),
        apiClient.publicUrlConfiguration.test(abortSignal, {})
      ]);
      return { host, llm, publicUrlTest };
    },
    [apiClient]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  const adminChatConfigured = isLlmUseCaseConfigured(loader.data.llm, LlmUseCase.ADMIN_CHAT);
  const userChatConfigured = isLlmUseCaseConfigured(loader.data.llm, LlmUseCase.USER_CHAT);
  const statuses: ConfigurationStatus[] = [
    {
      id: 'docker',
      label: 'Docker',
      value: loader.data.host.dockerVersion ? `Running · ${loader.data.host.dockerVersion}` : 'Not available',
      isHealthy: loader.data.host.dockerVersion !== null,
      remediation: 'Install Docker and make sure Docker daemon is running.'
    },
    {
      id: 'app-folder',
      label: 'Application folder',
      value: loader.data.host.isAppFolderReadable ? 'Readable' : 'Not readable',
      isHealthy: loader.data.host.isAppFolderReadable,
      remediation: 'Grant the server process read access to the Aila application folder.'
    },
    {
      id: 'data-folder',
      label: 'Application data folder',
      value: loader.data.host.isDataFolderWritable ? 'Writable' : 'Not writable',
      isHealthy: loader.data.host.isDataFolderWritable,
      remediation: 'Grant the server process write access to the Aila data folder.'
    },
    {
      id: 'public-url',
      label: 'Public URL',
      value: publicUrlStatusValue(loader.data.publicUrlTest.publicUrl, loader.data.publicUrlTest.isAvailable),
      isHealthy: loader.data.publicUrlTest.isAvailable,
      remediation: loader.data.publicUrlTest.publicUrl
        ? (loader.data.publicUrlTest.error ?? 'Make sure the configured URL is externally accessible.')
        : 'Configure the externally accessible URL for this Aila server.',
      action: { label: 'Configure Public URL', href: '/admin/configuration?tab=public-url' }
    },
    {
      id: 'admin-chat-ai',
      label: 'Admin chat AI',
      value: adminChatConfigured ? 'Configured' : 'Not configured',
      isHealthy: adminChatConfigured,
      remediation: 'Configure an LLM provider and assign it to Admin chat.',
      action: { label: 'Configure LLM', href: '/admin/configuration?tab=llm' }
    },
    {
      id: 'user-chat-ai',
      label: 'User chat AI',
      value: userChatConfigured ? 'Configured' : 'Not configured',
      isHealthy: userChatConfigured,
      remediation: 'Configure an LLM provider and assign it to User chat.',
      action: { label: 'Configure LLM', href: '/admin/configuration?tab=llm' }
    }
  ];

  return <ConfigurationOverviewView title="System status" statuses={statuses} />;
}

function publicUrlStatusValue(publicUrl: string | null, isAvailable: boolean): string {
  if (!publicUrl) {
    return 'Not configured';
  }
  return `${isAvailable ? 'Available' : 'Unavailable'} · ${publicUrl}`;
}

function isLlmUseCaseConfigured(configuration: GetLlmConfigurationResponse, useCase: LlmUseCase): boolean {
  const assignment = configuration.useCases.find(item => item.useCase === useCase);
  if (!assignment) {
    return false;
  }
  const provider = configuration.providers.find(item => item.id === assignment.providerId);
  if (!provider) {
    return false;
  }
  const requiresApiKey = LlmProviderPolicy.requiresApiKey(provider.type);
  return Boolean(provider.hasApiKey === requiresApiKey && provider.models.some(model => model.name === assignment.modelName));
}
