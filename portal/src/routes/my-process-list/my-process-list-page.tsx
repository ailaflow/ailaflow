import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ProcessDisplay, type MyProcessLiteDto } from '@ailaflow/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { MyProcessListView } from '../../views/my-process-list-view/process-list-view';
import { MyProcessStartFormPopup } from '../common/popups/my-process-start-form-popup';
import { MyTaskFormPopup } from '../common/popups/my-task-form-popup';
import { FormSubmittedAlertPopup } from '../common/popups/form-submitted-alert-popup';

const PAGE_SIZE = 20;

export function MyProcessListPage() {
  const apiClient = useApiClient();
  const [startedProcess, setStartedProcess] = useState<MyProcessLiteDto | null>(null);
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, error } = useLoader(
    signal =>
      apiClient.myProcess.getMyProcesses(signal, {
        page,
        pageSize: PAGE_SIZE,
        displayAtLeast: ProcessDisplay.LISTED
      }),
    [apiClient, page]
  );

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  function handleProcessEnded(candidateTaskIds?: string[]): void {
    setStartedProcess(null);

    const candidateTaskId = candidateTaskIds?.[0];
    if (candidateTaskId) {
      setOpenedTaskId(candidateTaskId);
    } else {
      setFormSubmitted(true);
    }
  }

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <>
      <MyProcessListView
        title="My Processes"
        items={data.processes.map(process => ({
          name: process.name,
          icon: process.icon,
          description: process.description,
          url: `/my-processes/${process.name}`,
          onClick: () => setStartedProcess(process)
        }))}
        emptyMessage="No processes found."
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          onPageChange: changePage
        }}
      />
      {startedProcess ? (
        <MyProcessStartFormPopup
          args={{ processName: startedProcess.name }}
          icon={startedProcess.icon}
          onEnded={handleProcessEnded}
          onClose={() => setStartedProcess(null)}
        />
      ) : null}
      {openedTaskId && (
        <MyTaskFormPopup
          args={{ taskId: openedTaskId }}
          onSubmitted={() => setFormSubmitted(true)}
          onClose={() => {
            setOpenedTaskId(null);
          }}
        />
      )}
      {formSubmitted && <FormSubmittedAlertPopup onClose={() => setFormSubmitted(false)} />}
    </>
  );
}
