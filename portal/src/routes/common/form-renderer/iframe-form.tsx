import { FormDefinition } from '@ailaflow/model';
import { useEffect, useMemo, useState } from 'react';
import { IframeContentBuilder } from './iframe-content-builder';
import { IframeFormView } from '../../../views/form-renderer/iframe-form-view';
import { FormAdapter } from './form-adapter';

export interface IframeFormProps {
  form: FormDefinition;
  adapter: FormAdapter;
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

export function IframeForm({ form, adapter }: IframeFormProps) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const content = useMemo(() => IframeContentBuilder.build(form), [form]);

  useEffect(() => {
    if (!iframe) {
      return;
    }

    const sendResponse = (message: ResponseMessage) => {
      iframe.contentWindow?.postMessage(message, '*');
    };

    const handle = async (message: RequestMessage, handler: (abortSignal: AbortSignal) => Promise<unknown>) => {
      try {
        const abortSignal = AbortSignal.timeout(5_000);
        const payload = await handler(abortSignal);
        sendResponse({
          id: message.id,
          type: message.type,
          payload
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

    const submitForm = async (payload: Record<string, unknown>) => {
      for (const name of adapter.outputVariableNames) {
        const value = payload[name];
        if (!value) {
          throw new Error(`Output variable ${name} is required but not provided.`);
        }
        adapter.assertVariableValue(name, value);
      }
      const abortSignal = AbortSignal.timeout(5_000);
      await adapter.submit(abortSignal, payload);
    };

    const readVariable = async (abortSignal: AbortSignal, payload: Record<string, unknown>) => {
      let name = payload.name as string;
      return adapter.readVariable(abortSignal, name);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const message = event.data as RequestMessage;
      if (!message || !message.id || !message.payload) {
        return;
      }
      handle(message, async abortSignal => {
        switch (message.type) {
          case 'submitForm':
            return submitForm(message.payload);
          case 'readVariable':
            return readVariable(abortSignal, message.payload);
          default:
            throw new Error('Unknown message type');
        }
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframe, adapter]);

  return <IframeFormView setIframe={setIframe} content={content} />;
}
