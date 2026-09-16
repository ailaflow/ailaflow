import { SlackConnectionStatus } from '@ailaflow/shared';
import type { MySlackConfigurationResponse } from '@ailaflow/shared';

export function MySlackConfigurationView(props: { configuration: MySlackConfigurationResponse }) {
  const configuration = props.configuration;
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Slack</h2>
        {configuration.status === SlackConnectionStatus.CONNECTED ? (
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Your AilaFlow account is connected to Slack as {configuration.displayName} in the {configuration.workspaceName} workspace.
          </p>
        ) : configuration.status === SlackConnectionStatus.UNAVAILABLE ? (
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Your account is mapped to Slack, but the Slack integration is currently unavailable. Contact your administrator.
          </p>
        ) : (
          <div className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
            <p>Your AilaFlow account is not connected to Slack.</p>
            <p>To connect your account, contact your administrator.</p>
          </div>
        )}
        {configuration.status === SlackConnectionStatus.CONNECTED && configuration.email ? (
          <p className="mt-3 text-xs text-slate-500">Slack email: {configuration.email}</p>
        ) : null}
      </div>
    </div>
  );
}
