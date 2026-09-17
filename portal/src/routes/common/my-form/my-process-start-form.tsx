import { HttpClientSseListener, useLoader } from '@aibindkit/react';
import {
  JsonSchema,
  ProcessExecutionOutcomeType,
  type FormDefinition,
  type ProcessExecutionVariableValues,
  type StartMyProcessRequest,
  type StartMyProcessUpdate
} from '@ailaflow/shared';
import { useEffect, useMemo, useState } from 'react';
import { useApiClient } from '../../../auth/auth-context';
import { MyFormErrorView } from '../../../views/common/my-form/my-form-error-view';
import { MyFormLoadingView } from '../../../views/common/my-form/my-form-loading-view';
import { FormAdapter } from '../form-renderer/form-adapter';
import { FormRenderer } from '../form-renderer/form-renderer';

enum StateType {
  LOADING_START_FORM,
  START_FORM,
  EXECUTING,
  OUTPUT_FORM,
  ERROR
}

interface LoadingStartFormState {
  type: StateType.LOADING_START_FORM;
  args: MyProcessStartFormArgs;
}

interface StartFormState {
  type: StateType.START_FORM;
  args: MyProcessStartFormArgs;
  startVariableSchemas: JsonSchema | null;
  form: FormDefinition | null;
}

interface ExecutingState {
  type: StateType.EXECUTING;
  args: MyProcessStartFormArgs;
  startValues: ProcessExecutionVariableValues;
}

interface OutputFormState {
  type: StateType.OUTPUT_FORM;
  args: MyProcessStartFormArgs;
  outputValues: ProcessExecutionVariableValues;
  form?: FormDefinition;
}

interface ErrorState {
  type: StateType.ERROR;
  error: Error;
}

export interface MyProcessStartFormArgs {
  processName: string;
  testUserName?: string;
  chatSession?: StartMyProcessRequest['chatSession'];
}

export interface MyProcessStartFormProps {
  args: MyProcessStartFormArgs;
  onEnded?: () => void;
}

export function MyProcessStartForm({ args, onEnded }: MyProcessStartFormProps) {
  const apiClient = useApiClient();
  const [state, setState] = useState<LoadingStartFormState | StartFormState | ExecutingState | OutputFormState | ErrorState>(() => ({
    type: StateType.LOADING_START_FORM,
    args
  }));

  useEffect(() => {
    const abortController = new AbortController();

    async function load(s: LoadingStartFormState) {
      try {
        const f = await apiClient.myProcess.getMyProcessStartForm(abortController.signal, s.args.processName, {
          testUserName: s.args.testUserName
        });
        setState({
          type: StateType.START_FORM,
          args: s.args,
          startVariableSchemas: f.startVariableSchemas,
          form: f.form
        });
      } catch (e) {
        setState({
          type: StateType.ERROR,
          error: e instanceof Error ? e : new Error(String(e))
        });
      }
    }

    if (state.type === StateType.LOADING_START_FORM) {
      void load(state);
    }
    return () => abortController.abort();
  }, [state]);

  useEffect(() => {
    const abortController = new AbortController();

    async function execute(s: ExecutingState) {
      let done = false;
      const listener: HttpClientSseListener<StartMyProcessUpdate> = {
        onMessage(update) {
          if (update.outcome) {
            done = true;
            switch (update.outcome.type) {
              case ProcessExecutionOutcomeType.FINISHED:
                if (!update.outcome.interruptedStepId) {
                  onEnded?.();
                  return;
                }
                setState({
                  type: StateType.OUTPUT_FORM,
                  args: s.args,
                  outputValues: update.outcome.output,
                  form: update.form
                });
                return;
              case ProcessExecutionOutcomeType.FAILED:
                setState({
                  type: StateType.ERROR,
                  error: new Error(update.outcome.error)
                });
                return;
              case ProcessExecutionOutcomeType.PAUSED:
                onEnded?.();
                return;
            }
          }
        },
        onClose() {
          if (!done) {
            setState({
              type: StateType.ERROR,
              error: new Error('Connection closed before process finished')
            });
          }
        }
      };

      try {
        await apiClient.myProcess.startMyProcess(abortController.signal, listener, s.args.processName, {
          startValues: s.startValues,
          chatSession: s.args.chatSession
        });
      } catch (e) {
        setState({
          type: StateType.ERROR,
          error: e instanceof Error ? e : new Error(String(e))
        });
      }
    }

    if (state.type === StateType.EXECUTING) {
      execute(state);
    }
    return () => abortController.abort();
  }, [state, onEnded]);

  const formAdapter = useMemo<FormAdapter | null>(() => {
    if (state.type === StateType.START_FORM) {
      return {
        allowedToReadVariableNames: [],
        outputVariableNames: state.startVariableSchemas ? Object.keys(state.startVariableSchemas) : [],
        assertVariableValue() {},
        async openStartForm() {
          setState({
            type: StateType.LOADING_START_FORM,
            args: state.args
          });
        },
        async submitForm(_: AbortSignal, startValues: Record<string, unknown>) {
          setState({
            type: StateType.EXECUTING,
            startValues,
            args: state.args
          });
        },
        readVariable: async () => {
          throw new Error('Reading variables is not allowed');
        }
      };
    }

    if (state.type === StateType.OUTPUT_FORM) {
      return {
        allowedToReadVariableNames: Object.keys(state.outputValues),
        outputVariableNames: [],
        assertVariableValue() {},
        async openStartForm() {
          setState({
            type: StateType.LOADING_START_FORM,
            args: state.args
          });
        },
        async submitForm(_, values) {
          setState({
            type: StateType.EXECUTING,
            startValues: values,
            args: {
              processName: state.args.processName,
              testUserName: state.args.testUserName
            }
          });
        },
        readVariable: async (_, name) => state.outputValues[name]
      };
    }

    return null;
  }, [state]);

  if (state.type === StateType.ERROR) {
    return <MyFormErrorView error={state.error} />;
  }

  if ((state.type === StateType.START_FORM || state.type === StateType.OUTPUT_FORM) && formAdapter) {
    return <FormRenderer form={state.form} adapter={formAdapter} />;
  }

  return <MyFormLoadingView />;
}
