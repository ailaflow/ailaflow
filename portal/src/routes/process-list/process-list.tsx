import { Link } from 'react-router-dom';
import { AdminPortalLayout } from '../../components/layouts/admin-portal-layout';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';

export function ProcessList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.process.getProcesses(abortSignal), [apiClient]);

  if (isLoading) {
    return (
      <AdminPortalLayout>
        <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading processes...</div>
      </AdminPortalLayout>
    );
  }

  if (error) {
    return (
      <AdminPortalLayout>
        <div className="p-5">
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Error: {String(error)}</div>
        </div>
      </AdminPortalLayout>
    );
  }

  const processes = data.processes;

  return (
    <AdminPortalLayout>
      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Processes</h1>
            </div>

            <Link
              to="/admin/create-process"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Create new
            </Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="min-w-full table-fixed divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="w-[22%] px-3 py-2.5 font-semibold text-slate-600">
                    Name
                  </th>
                  <th scope="col" className="w-[34%] px-3 py-2.5 font-semibold text-slate-600">
                    Description
                  </th>
                  <th scope="col" className="w-[16%] px-3 py-2.5 font-semibold text-slate-600">
                    User list
                  </th>
                  <th scope="col" className="w-[18%] px-3 py-2.5 text-right font-semibold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                      No processes found.
                    </td>
                  </tr>
                ) : (
                  processes.map(process => (
                    <tr key={process.id} className="transition-colors hover:bg-slate-50">
                      <td className="truncate px-3 py-3 font-medium text-slate-900">
                        <span className="inline-flex h-4 w-4 items-center mr-2 justify-center rounded border border-slate-300 text-[10px] font-semibold text-slate-600">
                          /
                        </span>
                        {process.name}
                      </td>
                      <td className="truncate px-3 py-3 text-slate-600">{process.description}</td>
                      <td className="truncate px-3 py-3 text-slate-600">{process.userList}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-nowrap justify-end gap-2">
                          <Link
                            type="button"
                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            to={`/admin/processes/${process.id}`}
                          >
                            Edit
                          </Link>
                          <Link
                            type="button"
                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            to={`/admin/processes/${process.id}/test`}
                          >
                            Test
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPortalLayout>
  );
}
