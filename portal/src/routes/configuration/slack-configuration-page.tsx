import { useLoader } from '@aibindkit/react';
import type { GetSlackConfigurationResponse, GetSlackUsersResponse, SlackUserDto } from '@ailaflow/shared';
import { useEffect, useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { SlackConfigurationView } from '../../views/configuration/slack-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { FindUserPopup } from '../common/popups/find-user-popup';
import { useSlackConfigurationState } from './slack-configuration-state';

const PAGE_SIZE = 50;

export function SlackConfigurationPage() {
  const apiClient = useApiClient();
  const loader = useLoader(
    async abortSignal => {
      const configuration = await apiClient.slackConfiguration.get(abortSignal);
      const users = configuration.isConfigured
        ? await apiClient.slackConfiguration.getUsers(abortSignal, { page: 1, pageSize: PAGE_SIZE })
        : emptyUsers(configuration.mappingRevision);
      return { configuration, users };
    },
    [apiClient]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <LoadedSlackConfigurationPage initialConfiguration={loader.data.configuration} initialUsers={loader.data.users} />;
}

function LoadedSlackConfigurationPage(props: { initialConfiguration: GetSlackConfigurationResponse; initialUsers: GetSlackUsersResponse }) {
  const apiClient = useApiClient();
  const [configuration, setConfiguration] = useState(props.initialConfiguration);
  const [usersResponse, setUsersResponse] = useState(props.initialUsers);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingMappings, setIsSavingMappings] = useState(false);
  const [selectedSlackUser, setSelectedSlackUser] = useState<SlackUserDto | null>(null);
  const state = useSlackConfigurationState(usersResponse.users);
  useUnsavedChangesController(state.isMappingDirty || state.hasCredentialDraft);

  useEffect(() => {
    if (!configuration.isConfigured) {
      setUsersResponse(emptyUsers(0));
      return;
    }
    const abortController = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoadingUsers(true);
      try {
        setUsersResponse(
          await apiClient.slackConfiguration.getUsers(abortController.signal, {
            page,
            pageSize: PAGE_SIZE,
            search: search.trim() || undefined
          })
        );
      } catch (error) {
        if (!abortController.signal.aborted) {
          window.alert(`Failed to load Slack users: ${formatError(error)}`);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingUsers(false);
        }
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [apiClient, configuration.isConfigured, configuration.workspaceId, page, search]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (state.isMappingDirty || state.hasCredentialDraft) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.hasCredentialDraft, state.isMappingDirty]);

  async function saveConfiguration(): Promise<void> {
    setIsSavingConfiguration(true);
    try {
      const request = {
        ...(state.appToken.trim() ? { appToken: state.appToken.trim() } : {}),
        ...(state.botToken.trim() ? { botToken: state.botToken.trim() } : {})
      };
      const saved = await apiClient.slackConfiguration.save(AbortSignal.timeout(15_000), request);
      setConfiguration(saved);
      state.credentialsSaved();
      setPage(1);
    } catch (error) {
      window.alert(`Failed to save Slack connection: ${formatError(error)}`);
    } finally {
      setIsSavingConfiguration(false);
    }
  }

  async function disconnect(): Promise<void> {
    if (!window.confirm('Disconnect Slack? User mappings will be removed. Cached Slack users will be preserved.')) {
      return;
    }
    setIsSavingConfiguration(true);
    try {
      await apiClient.slackConfiguration.delete(AbortSignal.timeout(10_000));
      state.cancelMappings();
      state.credentialsSaved();
      setConfiguration(await apiClient.slackConfiguration.get(AbortSignal.timeout(10_000)));
    } catch (error) {
      window.alert(`Failed to disconnect Slack: ${formatError(error)}`);
    } finally {
      setIsSavingConfiguration(false);
    }
  }

  async function refresh(): Promise<void> {
    if (state.isMappingDirty) {
      return;
    }
    setIsRefreshing(true);
    try {
      await apiClient.slackConfiguration.refreshUsers(AbortSignal.timeout(30_000));
      await reloadUsers();
      setConfiguration(await apiClient.slackConfiguration.get(AbortSignal.timeout(10_000)));
    } catch (error) {
      window.alert(`Failed to refresh Slack users: ${formatError(error)}`);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function saveMappings(): Promise<void> {
    setIsSavingMappings(true);
    try {
      const response = await apiClient.slackConfiguration.saveMappings(AbortSignal.timeout(15_000), {
        expectedRevision: usersResponse.mappingRevision,
        changes: state.mappingChanges()
      });
      state.cancelMappings();
      setConfiguration(current => ({ ...current, mappingRevision: response.mappingRevision }));
      await reloadUsers();
    } catch (error) {
      window.alert(`Failed to save Slack mappings. Reload if another administrator changed them: ${formatError(error)}`);
    } finally {
      setIsSavingMappings(false);
    }
  }

  async function reloadUsers(): Promise<void> {
    setUsersResponse(
      await apiClient.slackConfiguration.getUsers(AbortSignal.timeout(10_000), {
        page,
        pageSize: PAGE_SIZE,
        search: search.trim() || undefined
      })
    );
  }

  const disabledUserNames = state.visibleUsers.flatMap(user => (user.userName ? [user.userName] : []));
  return (
    <>
      <SlackConfigurationView
        configuration={configuration}
        appToken={state.appToken}
        botToken={state.botToken}
        users={state.visibleUsers}
        search={search}
        page={page}
        pageSize={usersResponse.pageSize}
        totalCount={usersResponse.totalCount}
        isLoadingUsers={isLoadingUsers}
        isSavingConfiguration={isSavingConfiguration}
        isRefreshing={isRefreshing}
        isSavingMappings={isSavingMappings}
        isMappingDirty={state.isMappingDirty}
        canSaveConfiguration={
          state.hasCredentialDraft &&
          (configuration.isConfigured || Boolean(state.appToken.trim() && state.botToken.trim())) &&
          !isSavingConfiguration
        }
        onAppTokenChange={state.setAppToken}
        onBotTokenChange={state.setBotToken}
        onSaveConfiguration={saveConfiguration}
        onDisconnect={disconnect}
        onRefresh={refresh}
        onSearchChange={value => {
          setSearch(value);
          setPage(1);
        }}
        onPageChange={setPage}
        onFindUser={setSelectedSlackUser}
        onRemoveMapping={slackUserId => state.changeMapping(slackUserId, null)}
        onSaveMappings={saveMappings}
        onCancelMappings={state.cancelMappings}
      />
      {selectedSlackUser ? (
        <FindUserPopup
          apiClient={apiClient}
          disabledUserNames={disabledUserNames.filter(userName => userName !== selectedSlackUser.userName)}
          initialSearch={selectedSlackUser.email ?? ''}
          title="Map Slack member"
          description={`Choose the AilaFlow user for ${displayName(selectedSlackUser)}.`}
          onSelectUser={userName => {
            state.changeMapping(selectedSlackUser.slackUserId, userName);
            setSelectedSlackUser(null);
          }}
          onClose={() => setSelectedSlackUser(null)}
        />
      ) : null}
    </>
  );
}

function emptyUsers(mappingRevision: number): GetSlackUsersResponse {
  return { users: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE, mappingRevision };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function displayName(user: SlackUserDto): string {
  return user.displayName || user.realName || user.legacyName || user.slackUserId;
}
