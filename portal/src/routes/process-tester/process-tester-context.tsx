import {
  ProcessExecutionOutcomeType,
  ProcessExecutionVariableValues,
  ProcessLogLevel,
  VariableCachedValidator,
  type ProcessDefinition,
  type ProcessDto,
  type ReturnStep,
  type TestProcessUpdate
} from '@ailaflow/shared';
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { DefinitionWalker } from 'sequential-workflow-model';
import { useApiClient, useSession } from '../../auth/auth-context';
import { ProcessTesterPreferencesStorage } from './process-tester-preferences-storage';
import {
  CurrentStepProcessExecutionTimelineItem,
  ErrorProcessExecutionTimelineItem,
  FormErrorProcessExecutionTimelineItem,
  FormProcessExecutionTimelineItem,
  LogProcessExecutionTimelineItem,
  OutputProcessExecutionTimelineItem,
  ProcessExecutionTimelineFormStatus,
  ProcessExecutionTimelineFormType,
  type ProcessExecutionTimelineItem
} from '../../views/common/process-execution-timeline-view';
import { FormError } from '../common/form-renderer/form-adapter';

export interface ProcessTesterData {
  process: ProcessDto;
  values: ProcessExecutionVariableValues | null;
  timelineItems: ProcessExecutionTimelineItem[];
  isRunning: boolean;
  currentUserName: string;
  chatUserNames: string[];
  activeChatUserName: string;
}

export interface ProcessTesterState extends ProcessTesterData {
  submitForm(values: ProcessExecutionVariableValues): void;
  openStartForm(): void;
  collectFormError(error: FormError): void;
  openUserChat(userName: string): void;
  selectUserChat(userName: string): void;
  closeUserChat(userName: string): void;
}

const processTesterContext = createContext<ProcessTesterState | null>(null);

export function useProcessTester(): ProcessTesterState {
  const context = useContext(processTesterContext);
  if (!context) {
    throw new Error('Cannot find process tester context');
  }
  return context;
}

export interface ProcessTesterContextProps {
  process: ProcessDto;
  children: React.ReactNode;
}

export function ProcessTesterContext(props: ProcessTesterContextProps) {
  const apiClient = useApiClient();
  const session = useSession();
  const preferencesStorage = useMemo(() => new ProcessTesterPreferencesStorage(), []);
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);
  const [data, update] = useReducer(reduceState, undefined, () => createData(props.process, session.userName, preferencesStorage));

  useEffect(() => {
    preferencesStorage.saveChatUserNames(data.chatUserNames);
  }, [data.chatUserNames, preferencesStorage]);

  useEffect(() => {
    async function test(signal: AbortSignal, values: ProcessExecutionVariableValues) {
      try {
        await apiClient.process.testProcess(
          signal,
          {
            onMessage(testUpdate) {
              update(state => {
                const timelineItems = createProcessTesterTimelineItems(testUpdate, state.process.definition, Date.now());
                return { timelineItems: [...state.timelineItems, ...timelineItems] };
              });
            },
            onClose() {
              update(state => {
                const item = new LogProcessExecutionTimelineItem([Date.now(), ProcessLogLevel.INFO, 'Connection closed']);
                return { timelineItems: [...state.timelineItems, item], isRunning: false };
              });
            }
          },
          data.process.name,
          { input: values }
        );
      } catch (e) {
        if (!signal.aborted) {
          update(state => {
            const item = new ErrorProcessExecutionTimelineItem(Date.now(), 'Connection error', String(e));
            return { timelineItems: [...state.timelineItems, item], isRunning: false };
          });
        }
      }
    }

    if (data.values) {
      const abortController = new AbortController();
      test(abortController.signal, data.values);
      return () => abortController.abort();
    }
  }, [apiClient, data.process.name, data.values]);

  const state = useMemo<ProcessTesterState>(() => {
    function submitForm(values: ProcessExecutionVariableValues) {
      const error = variableValidator.validateVariablesValue(
        values,
        data.process.definition.properties.startVariableNames,
        data.process.definition
      );
      if (error) {
        throw new Error(error);
      }
      update({
        values,
        isRunning: true,
        timelineItems: [createStartTimelineItem(ProcessExecutionTimelineFormStatus.COMPLETED)]
      });
    }

    function openStartForm() {
      update({
        values: null,
        timelineItems: [createStartTimelineItem(ProcessExecutionTimelineFormStatus.ACTIVE)],
        isRunning: false
      });
    }

    function collectFormError(error: FormError) {
      update(state => {
        const item = new FormErrorProcessExecutionTimelineItem(Date.now(), error.message, error.stack);
        return { timelineItems: [...state.timelineItems, item] };
      });
    }

    function openUserChat(userName: string) {
      update({
        chatUserNames: data.chatUserNames.includes(userName) ? data.chatUserNames : [...data.chatUserNames, userName],
        activeChatUserName: userName
      });
    }

    function selectUserChat(userName: string) {
      if (data.chatUserNames.includes(userName)) {
        update({ activeChatUserName: userName });
      }
    }

    function closeUserChat(userName: string) {
      if (userName === data.currentUserName) {
        return;
      }
      const userIndex = data.chatUserNames.indexOf(userName);
      if (userIndex === -1) {
        return;
      }

      const chatUserNames = data.chatUserNames.filter(name => name !== userName);
      update({
        chatUserNames,
        activeChatUserName:
          data.activeChatUserName === userName ? chatUserNames[Math.min(userIndex, chatUserNames.length - 1)] : data.activeChatUserName
      });
    }

    return {
      ...data,
      submitForm,
      openStartForm,
      collectFormError,
      openUserChat,
      selectUserChat,
      closeUserChat
    };
  }, [data, variableValidator]);

  return <processTesterContext.Provider value={state}>{props.children}</processTesterContext.Provider>;
}

type StateUpdate = Partial<ProcessTesterData> | ((state: ProcessTesterData) => Partial<ProcessTesterData>);

function reduceState(state: ProcessTesterData, stateUpdate: StateUpdate): ProcessTesterData {
  const delta = typeof stateUpdate === 'function' ? stateUpdate(state) : stateUpdate;
  return { ...state, ...delta };
}

function createData(process: ProcessDto, currentUserName: string, preferencesStorage: ProcessTesterPreferencesStorage): ProcessTesterData {
  const storedChatUserNames = preferencesStorage.readChatUserNames();
  const chatUserNames = storedChatUserNames.includes(currentUserName) ? storedChatUserNames : [currentUserName, ...storedChatUserNames];

  return {
    process,
    values: null,
    timelineItems: [createStartTimelineItem(ProcessExecutionTimelineFormStatus.ACTIVE)],
    isRunning: false,
    currentUserName,
    chatUserNames,
    activeChatUserName: currentUserName
  };
}

function createStartTimelineItem(status: ProcessExecutionTimelineFormStatus) {
  return new FormProcessExecutionTimelineItem(Date.now(), ProcessExecutionTimelineFormType.START, status);
}

function createProcessTesterTimelineItems(
  update: TestProcessUpdate,
  definition: ProcessDefinition,
  receivedAt: number
): ProcessExecutionTimelineItem[] {
  const items: ProcessExecutionTimelineItem[] = [];

  if (update.currentStepId) {
    const step = new DefinitionWalker().findById(definition, update.currentStepId);
    if (step) {
      items.push(new CurrentStepProcessExecutionTimelineItem(receivedAt, step.id, step.name));
    }
  }

  if (update.log) {
    items.push(new LogProcessExecutionTimelineItem(update.log));
  }

  const outcome = update.outcome;
  if (!outcome) {
    return items;
  }
  if (outcome.type === ProcessExecutionOutcomeType.FAILED) {
    items.push(new ErrorProcessExecutionTimelineItem(receivedAt, 'Process failed', outcome.error));
    return items;
  }
  if (outcome.type === ProcessExecutionOutcomeType.PAUSED) {
    items.push(new LogProcessExecutionTimelineItem([receivedAt, ProcessLogLevel.INFO, 'Process paused']));
    return items;
  }

  const step = outcome.interruptedStepId ? new DefinitionWalker().findById(definition, outcome.interruptedStepId) : null;
  const returnStep = step?.type === 'return' ? (step as ReturnStep) : null;
  if (returnStep?.properties.outputForm) {
    items.push(
      new FormProcessExecutionTimelineItem(
        receivedAt,
        ProcessExecutionTimelineFormType.OUTPUT,
        ProcessExecutionTimelineFormStatus.COMPLETED,
        returnStep.properties.outputForm,
        outcome.output
      )
    );
  } else {
    items.push(new OutputProcessExecutionTimelineItem(receivedAt, outcome.output));
  }

  return items;
}
