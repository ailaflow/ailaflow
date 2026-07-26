import { Chat } from '@aibindkit/react';
import { Portal } from '../common/portal';
import { useApiClient } from '../../auth/auth-context';
import { useMemo } from 'react';
import { ChatMessageType } from '@aibindkit/core';
import { ChatMessageMetadata } from '@aibindkit/core';

function metadataRenderer(metadata: ChatMessageMetadata) {
  const startForm = metadata['startForm'];
  if (typeof startForm === 'object' && startForm) {
    const processName = 'processName' in startForm && typeof startForm.processName === 'string' ? startForm.processName : null;

    return (
      <div className="mt-2 flex justify-start">
        <article className="max-w-[88%] rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-slate-800 shadow-sm">
          <div className="mb-1 text-[11px] font-semibold uppercase leading-tight text-orange-700">Start form</div>
          {processName && <div className="mb-2 text-sm font-medium text-slate-900">{processName}</div>}
          <pre className="max-h-72 overflow-auto rounded border border-orange-100 bg-white/70 p-2 font-mono text-xs leading-relaxed text-slate-700">
            {JSON.stringify(startForm, null, 2)}
          </pre>
        </article>
      </div>
    );
  }
  return null;
}

function messageFilter(type: ChatMessageType, metadata?: ChatMessageMetadata) {
  if (type === ChatMessageType.SYSTEM) {
    return false;
  }
  if (metadata?.['internal'] === true) {
    return false;
  }
  return true;
}

export function MyChat() {
  const api = useApiClient();

  const details = useMemo(
    () => ({
      params: {
        name: 'main'
      },
      frontendTools: [],
      frontEndToolCallsHandler: async () => null
    }),
    []
  );

  return (
    <Portal>
      <Chat
        transport={api.chat}
        params={details.params}
        frontendTools={details.frontendTools}
        frontEndToolCallsHandler={details.frontEndToolCallsHandler}
        messageFilter={messageFilter}
        metadataRenderer={metadataRenderer}
      />
    </Portal>
  );
}
