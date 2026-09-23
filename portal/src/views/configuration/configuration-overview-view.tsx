import { Link } from 'react-router';

export interface ConfigurationStatus {
  id: string;
  label: string;
  value: string;
  detail?: string;
  isHealthy: boolean;
  remediation: string;
  action?: {
    label: string;
    href: string;
  };
}

export interface ConfigurationOverviewViewProps {
  title: string;
  description: string;
  statuses: ConfigurationStatus[];
}

export function ConfigurationOverviewView(props: ConfigurationOverviewViewProps) {
  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{props.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{props.description}</p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {props.statuses.map(status => (
            <li key={status.id} className="min-w-0">
              <div
                className={`rounded-lg border px-4 py-3 shadow-sm ${
                  status.isHealthy ? 'border-slate-200 bg-white' : 'border-orange-300 bg-orange-50'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wide ${status.isHealthy ? 'text-slate-500' : 'text-orange-700'}`}>
                  {status.label}
                </div>
                <div
                  className={`mt-1 flex items-center gap-2 text-sm font-medium ${status.isHealthy ? 'text-slate-900' : 'text-orange-950'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${status.isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                  <span className="break-all">{status.value}</span>
                </div>
                {status.detail ? <div className="mt-1 break-all text-xs leading-5 text-slate-500">{status.detail}</div> : null}
              </div>

              {!status.isHealthy ? (
                <div className="px-1 pt-2 text-xs leading-5 text-slate-600">
                  <span>{status.remediation}</span>
                  {status.action ? (
                    <Link
                      to={status.action.href}
                      className="ml-1 font-medium text-orange-700 underline underline-offset-2 hover:text-orange-900"
                    >
                      {status.action.label}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
