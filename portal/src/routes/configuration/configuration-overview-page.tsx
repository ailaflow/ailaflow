import { useLoader } from '@aibindkit/react';
import { LicenseType, LlmProviderPolicy, LlmUseCase } from '@ailaflow/model';
import type { GetLlmConfigurationResponse } from '@ailaflow/model';
import { useApiClient } from '../../auth/auth-context';
import { ConfigurationOverviewView } from '../../views/configuration/configuration-overview-view';
import type { ConfigurationStatus } from '../../views/configuration/configuration-overview-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function ConfigurationOverviewPage() {
  const apiClient = useApiClient();
  const loader = useLoader(
    async abortSignal => {
      const [host, llm, publicUrlTest, license] = await Promise.all([
        apiClient.sandbox.diagnoseHost(abortSignal),
        apiClient.llmConfiguration.get(abortSignal),
        apiClient.publicUrlConfiguration.test(abortSignal, {}),
        apiClient.licenseConfiguration.getStatus(abortSignal)
      ]);
      return { host, llm, publicUrlTest, license };
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
  const agentStepConfigured = isLlmUseCaseConfigured(loader.data.llm, LlmUseCase.AGENT_STEP);
  const licenseStatus = loader.data.license.status;
  const statuses: ConfigurationStatus[] = [
    {
      id: 'docker',
      label: 'Docker',
      value: loader.data.host.dockerVersion ? 'Running' : 'Not available',
      detail: loader.data.host.dockerVersion ?? undefined,
      isHealthy: loader.data.host.dockerVersion !== null,
      remediation: 'Install Docker and make sure Docker daemon is running.'
    },
    {
      id: 'app-folder',
      label: 'Application folder',
      value: loader.data.host.isAppFolderReadable ? 'Readable' : 'Not readable',
      detail: loader.data.host.appFolderPath,
      isHealthy: loader.data.host.isAppFolderReadable,
      remediation: 'Grant the server process read access to the AilaFlow application folder.'
    },
    {
      id: 'data-folder',
      label: 'Application data folder',
      value: loader.data.host.isDataFolderWritable ? 'Writable' : 'Not writable',
      detail: loader.data.host.dataFolderPath,
      isHealthy: loader.data.host.isDataFolderWritable,
      remediation: 'Grant the server process write access to the AilaFlow data folder.'
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
    },
    {
      id: 'agent-step-ai',
      label: 'Agent step AI',
      value: agentStepConfigured ? 'Configured' : 'Not configured',
      isHealthy: agentStepConfigured,
      remediation: 'Configure an LLM provider and assign it to Agent step.',
      action: { label: 'Configure LLM', href: '/admin/configuration?tab=llm' }
    },
    {
      id: 'public-url',
      label: 'Public URL',
      value: publicUrlStatusValue(loader.data.publicUrlTest.publicUrl, loader.data.publicUrlTest.isAvailable),
      isHealthy: loader.data.publicUrlTest.isAvailable,
      remediation: loader.data.publicUrlTest.publicUrl
        ? (loader.data.publicUrlTest.error ?? 'Make sure the configured URL is externally accessible.')
        : 'Configure the externally accessible URL for this AilaFlow server.',
      action: { label: 'Configure Public URL', href: '/admin/configuration?tab=public-url' }
    },
    {
      id: 'license',
      label: 'License',
      value: licenseStatus
        ? `${licenseStatus.type === LicenseType.HOME ? 'Home' : 'Pro'} · ${licenseStatus.isValid ? 'Valid' : 'Invalid'}`
        : 'Not available',
      detail: licenseStatus ? `Last checked: ${new Date(licenseStatus.checkedAt).toLocaleString()}` : undefined,
      isHealthy: licenseStatus?.isValid ?? false,
      remediation: licenseStatus
        ? 'Review your license configuration and validate your license key.'
        : 'License status data is not available yet.',
      action: { label: 'Configure license', href: '/admin/configuration?tab=license' }
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
