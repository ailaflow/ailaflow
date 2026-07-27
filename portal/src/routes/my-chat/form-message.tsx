import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { FormRenderer } from '../form-renderer/form-renderer';
import { FormAdapter } from '../form-renderer/form-adapter';
import { useMemo } from 'react';

export interface FormMessageProps {
  processName: string;
  sessionToken: string;
  messageId: number;
  completedMessageIndex: number;
  finished: true | undefined;
}

export function FormMessage(props: FormMessageProps) {
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => apiClient.myProcess.getMyProcessStartForm(abortSignal, props.processName),
    [apiClient, props.processName]
  );

  const formAdapter: FormAdapter = useMemo(
    () => ({
      allowedToReadVariableNames: [],
      readVariable() {
        throw new Error('Start form cannot read variables');
      },
      outputVariableNames: data?.startVariableSchemas ? Object.keys(data.startVariableSchemas) : [],
      assertVariableValue() {},
      async submit(abortSignal: AbortSignal, data: Record<string, unknown>) {
        await apiClient.myProcess.startMyProcess(abortSignal, props.processName, {
          startValues: data,
          chatSession: {
            token: props.sessionToken,
            messageId: props.messageId,
            completedMessageIndex: props.completedMessageIndex
          }
        });
      }
    }),
    [data, props, apiClient]
  );

  if (isLoading) {
    return <CardView title="Form">Loading...</CardView>;
  }
  if (error) {
    return <CardView title="Form">Error: {error.message}</CardView>;
  }
  if (props.finished) {
    return <CardView title="Form">Finished</CardView>;
  }

  return (
    <CardView title="Form">
      <FormRenderer form={data.form} adapter={formAdapter} />
    </CardView>
  );
}

function CardView(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2 flex justify-start">
      <article className="max-w-[88%] rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-slate-800 shadow-sm">
        <div className="mb-1 text-[11px] font-semibold uppercase leading-tight text-orange-700">{props.title}</div>
        <div className="overflow-hidden">{props.children}</div>
      </article>
    </div>
  );
}
