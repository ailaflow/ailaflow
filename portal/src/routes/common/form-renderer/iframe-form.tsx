import { FormDefinition, ProcessExecutionVariableValues, UserAccessExpressionParser } from '@ailaflow/shared';
import { useEffect, useMemo, useState } from 'react';
import { IframeContentBuilder } from './iframe-content-builder';
import { IframeFormView } from '../../../views/form-renderer/iframe-form-view';
import { FormAdapter, FormTransientParams } from './form-adapter';
import { FormUserStorage } from './form-user-storage';

export interface IframeFormProps {
  form: FormDefinition;
  adapter: FormAdapter;
  isPreview?: boolean;
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

export function IframeForm({ form, adapter, isPreview }: IframeFormProps) {
  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  const userStorage = useMemo(() => new FormUserStorage(), []);
  const content = useMemo(() => IframeContentBuilder.build(form, isPreview ?? false), [form, isPreview]);

  useEffect(() => {
    if (!iframe) {
      return;
    }

    const sendResponse = (message: ResponseMessage) => {
      iframe.contentWindow?.postMessage(message, '*');
    };

    const handle = async (message: RequestMessage, handler: (signal: AbortSignal) => Promise<unknown>) => {
      try {
        const signal = AbortSignal.timeout(5_000);
        const payload = await handler(signal);
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
      const values = assertObject<ProcessExecutionVariableValues>(payload.values);
      const transientParams = payload.transientParams ? assertObject<FormTransientParams>(payload.transientParams) : undefined;

      for (const name of adapter.outputVariableNames) {
        const value = values[name];
        if (value === undefined) {
          throw new Error(`Output variable ${name} is required but not provided`);
        }
        adapter.assertVariableValue(name, value);
      }

      const signal = AbortSignal.timeout(5_000);
      await adapter.submitForm(signal, values, transientParams);
    };

    const readVariable = async (signal: AbortSignal, payload: Record<string, unknown>) => {
      let name = payload.name as string;
      return adapter.readVariable(signal, name);
    };

    const openStartForm = async (signal: AbortSignal, payload: Record<string, unknown>) => {
      const transientParams = payload.transientParams ? assertObject<FormTransientParams>(payload.transientParams) : undefined;
      return adapter.openStartForm(signal, transientParams);
    };

    const getTransientParams = async () => {
      return adapter.getTransientParams();
    };

    const collectFormError = async (payload: Record<string, unknown>) => {
      const message = payload.message as string;
      const stack = payload.stack as string | undefined;
      adapter.collectFormError?.({ message, stack });
      return {};
    };

    const validateUserAccessExpression = async (payload: Record<string, unknown>) => {
      const expression = payload.expression as string;
      return UserAccessExpressionParser.validate(expression);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      const message = event.data as RequestMessage;
      if (!message || !message.id || !message.payload) {
        return;
      }
      handle(message, async signal => {
        switch (message.type) {
          case 'openStartForm':
            return openStartForm(signal, message.payload);
          case 'submitForm':
            return submitForm(message.payload);
          case 'readVariable':
            return readVariable(signal, message.payload);
          case 'readUserStorage':
            return userStorage.readUserStorage(message.payload);
          case 'writeUserStorage':
            return userStorage.writeUserStorage(message.payload);
          case 'getTransientParams':
            return getTransientParams();
          case 'collectFormError':
            return collectFormError(message.payload);
          case 'validateUserAccessExpression':
            return validateUserAccessExpression(message.payload);
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

function assertObject<T extends Record<string, unknown>>(v: unknown): T {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('Value must be an object');
  }
  return v as T;
}
