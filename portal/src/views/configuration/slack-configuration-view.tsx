import type { GetSlackConfigurationResponse, SlackUserDto } from '@ailaflow/shared';
import { ExpandableTip } from '../common/expandable-tip';
import { PaginationView } from '../common/pagination-view';

export interface SlackConfigurationViewProps {
  configuration: GetSlackConfigurationResponse;
  appToken: string;
  botToken: string;
  users: SlackUserDto[];
  search: string;
  page: number;
  pageSize: number;
  totalCount: number;
  isLoadingUsers: boolean;
  isSavingConfiguration: boolean;
  isRefreshing: boolean;
  isSavingMappings: boolean;
  isMappingDirty: boolean;
  canSaveConfiguration: boolean;
  onAppTokenChange(value: string): void;
  onBotTokenChange(value: string): void;
  onSaveConfiguration(): void | Promise<void>;
  onDisconnect(): void | Promise<void>;
  onRefresh(): void | Promise<void>;
  onSearchChange(value: string): void;
  onPageChange(page: number): void;
  onFindUser(user: SlackUserDto): void;
  onRemoveMapping(slackUserId: string): void;
  onSaveMappings(): void | Promise<void>;
  onCancelMappings(): void;
}

export function SlackConfigurationView(props: SlackConfigurationViewProps) {
  const busy = props.isRefreshing || props.isSavingMappings;
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto space-y-4 max-w-6xl">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Workspace connection</h2>
            <p className="mt-1 text-sm text-slate-500">Connect the Aila Slack App through Socket Mode.</p>
          </div>
          <div className="space-y-4 p-4">
            <ExpandableTip
              title="Set up the Aila Slack App"
              summary="Create one Slack App, enable App Home messages and Socket Mode, then configure its event subscription and permissions before entering the tokens below."
            >
              <ol className="list-decimal space-y-1 pl-5">
                <li>Create an internal Slack App named Aila in the workspace you want to connect.</li>
                <li>Enable the App Home Messages tab and Socket Mode.</li>
                <li>
                  Subscribe the bot to the <code className="rounded bg-white px-1 py-0.5 text-xs">message.im</code> event.
                </li>
                <li>
                  Add the bot scopes <code className="rounded bg-white px-1 py-0.5 text-xs">chat:write</code>,{' '}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">im:history</code>,{' '}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">users:read</code>, and{' '}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">users:read.email</code>.
                </li>
                <li>
                  Install or reinstall the app, then create an app-level token with the{' '}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">connections:write</code> scope.
                </li>
              </ol>
              <p className="mt-2">
                Enter the <code className="rounded bg-white px-1 py-0.5 text-xs">xapp-…</code> app-level token and{' '}
                <code className="rounded bg-white px-1 py-0.5 text-xs">xoxb-…</code> bot token below. A signing secret and individual member
                OAuth are not required.
              </p>
            </ExpandableTip>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <Status label="Workspace" value={props.configuration.workspaceName ?? 'Not configured'} />
              <Status label="Bot user" value={props.configuration.botUserId ?? 'Not configured'} />
              <Status
                label="Socket Mode"
                value={
                  props.configuration.runtime.isConnected
                    ? 'Connected'
                    : props.configuration.isConfigured
                      ? 'Unavailable'
                      : 'Not configured'
                }
              />
            </div>
            {props.configuration.runtime.lastError ? (
              <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
                {props.configuration.runtime.lastError}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <TokenInput
                label="App-level token"
                placeholder={props.configuration.hasAppToken ? 'Configured — leave blank to keep' : 'xapp-…'}
                value={props.appToken}
                onChange={props.onAppTokenChange}
              />
              <TokenInput
                label="Bot token"
                placeholder={props.configuration.hasBotToken ? 'Configured — leave blank to keep' : 'xoxb-…'}
                value={props.botToken}
                onChange={props.onBotTokenChange}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {props.configuration.isConfigured ? (
                <button
                  type="button"
                  onClick={() => void props.onDisconnect()}
                  disabled={props.isSavingConfiguration}
                  className="cursor-pointer h-9 rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void props.onSaveConfiguration()}
                disabled={!props.canSaveConfiguration}
                className="cursor-pointer h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {props.isSavingConfiguration ? 'Saving…' : 'Save connection'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Slack users</h2>
              <p className="mt-1 text-sm text-slate-500">
                {props.configuration.directoryLastRefreshedAt
                  ? `Last refreshed ${new Date(props.configuration.directoryLastRefreshedAt).toLocaleString()}`
                  : 'The Slack directory has not been refreshed.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void props.onRefresh()}
              disabled={!props.configuration.isConfigured || busy || props.isMappingDirty}
              title={props.isMappingDirty ? 'Save or cancel mapping changes before refreshing.' : undefined}
              className="cursor-pointer h-9 shrink-0 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {props.isRefreshing ? 'Refreshing…' : 'Refresh Slack users'}
            </button>
          </div>
          <div className="p-4">
            <input
              type="search"
              value={props.search}
              onChange={event => props.onSearchChange(event.currentTarget.value)}
              placeholder="Search Slack users…"
              aria-label="Search Slack users"
              className="mb-4 h-9 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500 sm:max-w-sm"
            />
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Slack member</th>
                    <th className="px-3 py-2">AilaFlow user</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {props.isLoadingUsers ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                        Loading Slack users…
                      </td>
                    </tr>
                  ) : props.users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-slate-500">
                        No Slack users found.
                      </td>
                    </tr>
                  ) : (
                    props.users.map(user => (
                      <tr key={user.slackUserId} className={user.isDeleted ? 'bg-slate-50 text-slate-500' : ''}>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900">{displayName(user)}</div>
                          <div className="text-xs text-slate-500">{user.email ?? user.slackUserId}</div>
                        </td>
                        <td className="px-3 py-3">{user.userName ? `@${user.userName}` : 'Not mapped'}</td>
                        <td className="px-3 py-3">
                          {user.isDeleted
                            ? 'Unavailable'
                            : user.welcomeLastError
                              ? `Welcome failed: ${user.welcomeLastError}`
                              : user.userName
                                ? 'Mapped'
                                : 'Active'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {user.userName ? (
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={busy || user.isDeleted}
                                onClick={() => props.onFindUser(user)}
                                className="cursor-pointer text-sm font-medium text-slate-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => props.onRemoveMapping(user.slackUserId)}
                                className="cursor-pointer text-sm font-medium text-red-700 underline disabled:cursor-not-allowed disabled:text-slate-400"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={busy || user.isDeleted}
                              onClick={() => props.onFindUser(user)}
                              className="cursor-pointer text-sm font-medium text-slate-800 underline disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              Find user
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <PaginationView page={props.page} pageSize={props.pageSize} totalCount={props.totalCount} onPageChange={props.onPageChange} />
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={!props.isMappingDirty || busy}
              onClick={props.onCancelMappings}
              className="cursor-pointer h-9 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!props.isMappingDirty || busy}
              onClick={() => void props.onSaveMappings()}
              className="cursor-pointer h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {props.isSavingMappings ? 'Saving…' : 'Save mappings'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Status(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500">{props.label}</div>
      <div className="mt-1 break-all font-medium text-slate-900">{props.value}</div>
    </div>
  );
}

function TokenInput(props: { label: string; value: string; placeholder: string; onChange(value: string): void }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {props.label}
      <input
        type="password"
        autoComplete="off"
        value={props.value}
        placeholder={props.placeholder}
        onChange={event => props.onChange(event.currentTarget.value)}
        className="mt-1.5 h-9 w-full rounded-md border border-slate-300 px-3 font-mono text-sm font-normal outline-none focus:border-slate-500"
      />
    </label>
  );
}

function displayName(user: SlackUserDto): string {
  return user.displayName || user.realName || user.legacyName || user.slackUserId;
}
