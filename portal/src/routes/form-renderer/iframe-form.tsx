import { FormDefinition } from '@aila/model';
import { useEffect, useMemo, useState } from 'react';
import { IframeContentBuilder } from './iframe-content-builder';
import { IframeFormView } from '../../views/form-renderer/iframe-form-view';

export interface IframeFormProps {
  form: FormDefinition;
  onSubmit(data: Record<string, unknown>): void;
}

interface RequestMessage {
  type: string;
  id: number;
  payload: Record<string, unknown>;
}

interface ResponseMessage {
  type: string;
  id: number;
  payload?: unknown;
  error?: string;
}

export function IframeForm(props: IframeFormProps) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const content = useMemo(() => IframeContentBuilder.build(props.form), [props.form]);

  useEffect(() => {
    if (!iframe) {
      return;
    }

    const sendResponse = (message: ResponseMessage) => {
      iframe.contentWindow?.postMessage(message, '*');
    };

    const handleSubmitForm = (message: RequestMessage) => {
      try {
        props.onSubmit(message.payload);
        sendResponse({
          id: message.id,
          type: message.type,
          payload: true
        });
      } catch (e) {
        const error = (e as Error)?.message ?? String(e);
        sendResponse({
          id: message.id,
          type: message.type,
          error
        });
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const message = event.data as RequestMessage;
      if (message.type && message.id && message.payload) {
        switch (message.type) {
          case 'submitForm':
            handleSubmitForm(message);
            break;
          default:
            sendResponse({
              id: message.id,
              type: message.type,
              error: 'Unknown message type'
            });
            break;
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframe]);

  return <IframeFormView setIframe={setIframe} content={content} />;
}
