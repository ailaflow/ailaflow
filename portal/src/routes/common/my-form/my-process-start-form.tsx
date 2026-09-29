import { HttpClientSseListener } from '@aibindkit/react';
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
import { MyFormContainerView } from '../../../views/common/my-form/my-form-container-view';
import { MyFormErrorView } from '../../../views/common/my-form/my-form-error-view';
import { MyFormLoadingView } from '../../../views/common/my-form/my-form-loading-view';
import { FormAdapter, FormError, FormTransientParams } from '../form-renderer/form-adapter';
import { FormRenderer } from '../form-renderer/form-renderer';
import { MyFormOutputView } from '../../../views/common/my-form/my-form-output-view';

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
  transientParams?: FormTransientParams;
}

interface StartFormState {
  type: StateType.START_FORM;
  args: MyProcessStartFormArgs;
  startVariableSchemas: JsonSchema | null;
  form: FormDefinition | null;
  transientParams?: FormTransientParams;
}

interface ExecutingState {
  type: StateType.EXECUTING;
  args: MyProcessStartFormArgs;
  startValues: ProcessExecutionVariableValues;
  transientParams?: FormTransientParams;
}

interface OutputFormState {
  type: StateType.OUTPUT_FORM;
  args: MyProcessStartFormArgs;
  outputValues: ProcessExecutionVariableValues;
  transientParams?: FormTransientParams;
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
  onEnded?: (candidateTaskIds?: string[]) => void;
}

export function MyProcessStartForm({ args, onEnded }: MyProcessStartFormProps) {
  const apiClient = useApiClient();
  const [formError, setFormError] = useState<FormError | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
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
          form: f.form,
          transientParams: s.transientParams
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
          if (update.progressLabel) {
            setProgressLabel(update.progressLabel);
          }
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
                  form: update.form,
                  transientParams: s.transientParams
                });
                return;
              case ProcessExecutionOutcomeType.FAILED:
                setState({
                  type: StateType.ERROR,
                  error: new Error(update.outcome.error)
                });
                return;
              case ProcessExecutionOutcomeType.PAUSED:
                onEnded?.(update.candidateTaskIds);
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
        async openStartForm(_: AbortSignal, transientParams?: FormTransientParams) {
          setState({
            type: StateType.LOADING_START_FORM,
            args: state.args,
            transientParams
          });
        },
        async submitForm(_: AbortSignal, startValues: ProcessExecutionVariableValues, transientParams?: FormTransientParams) {
          if (formError) {
            setFormError(null);
          }
          setState({
            type: StateType.EXECUTING,
            startValues,
            args: state.args,
            transientParams
          });
        },
        readVariable: async () => {
          throw new Error('Reading variables is not allowed');
        },
        getTransientParams: () => state.transientParams ?? null,
        collectFormError: setFormError
      };
    }

    if (state.type === StateType.OUTPUT_FORM) {
      return {
        allowedToReadVariableNames: Object.keys(state.outputValues),
        outputVariableNames: [],
        assertVariableValue() {},
        async openStartForm(_: AbortSignal, transientParams?: FormTransientParams) {
          setState({
            type: StateType.LOADING_START_FORM,
            args: state.args,
            transientParams
          });
        },
        async submitForm(_, values, transientParams?: FormTransientParams) {
          if (formError) {
            setFormError(null);
          }
          setState({
            type: StateType.EXECUTING,
            startValues: values,
            transientParams,
            args: {
              processName: state.args.processName,
              testUserName: state.args.testUserName
            }
          });
        },
        readVariable: async (_, name) => state.outputValues[name],
        getTransientParams: () => state.transientParams ?? null,
        collectFormError: setFormError
      };
    }

    return null;
  }, [state]);

  if (state.type === StateType.ERROR) {
    return <MyFormErrorView error={state.error} />;
  }

  if (formAdapter) {
    if (state.type === StateType.START_FORM || state.type === StateType.OUTPUT_FORM) {
      if (state.type === StateType.OUTPUT_FORM && !state.form) {
        return <MyFormOutputView outputValues={state.outputValues} />;
      }
      return (
        <MyFormContainerView formError={formError} onFormErrorClose={() => setFormError(null)}>
          <FormRenderer form={state.form} adapter={formAdapter} />
        </MyFormContainerView>
      );
    }
  }
  return <MyFormLoadingView progressLabel={progressLabel} />;
}
