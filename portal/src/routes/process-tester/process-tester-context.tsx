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
  CurrentStepProcessTesterTimelineItem,
  ErrorProcessTesterTimelineItem,
  FormProcessTesterTimelineItem,
  LogProcessTesterTimelineItem,
  OutputProcessTesterTimelineItem,
  ProcessTesterTimelineFormStatus,
  ProcessTesterTimelineFormType,
  type ProcessTesterTimelineItem
} from '../../views/process-tester/process-tester-top-view';

export interface ProcessTesterData {
  process: ProcessDto;
  values: ProcessExecutionVariableValues | null;
  timelineItems: ProcessTesterTimelineItem[];
  isRunning: boolean;
  currentUserName: string;
  chatUserNames: string[];
  activeChatUserName: string;
}

export interface ProcessTesterState extends ProcessTesterData {
  submitForm(values: ProcessExecutionVariableValues): void;
  openStartForm(): void;
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
                const time = Date.now();
                const item = new LogProcessTesterTimelineItem(time, ProcessLogLevel.INFO, 'Connection closed');
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
            const item = new ErrorProcessTesterTimelineItem(Date.now(), 'Connection error', String(e));
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
        timelineItems: [createStartTimelineItem(ProcessTesterTimelineFormStatus.COMPLETED)]
      });
    }

    function openStartForm() {
      update({
        values: null,
        timelineItems: [createStartTimelineItem(ProcessTesterTimelineFormStatus.ACTIVE)],
        isRunning: false
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
    timelineItems: [createStartTimelineItem(ProcessTesterTimelineFormStatus.ACTIVE)],
    isRunning: false,
    currentUserName,
    chatUserNames,
    activeChatUserName: currentUserName
  };
}

function createStartTimelineItem(status: ProcessTesterTimelineFormStatus) {
  return new FormProcessTesterTimelineItem(Date.now(), ProcessTesterTimelineFormType.START, status);
}

function createProcessTesterTimelineItems(
  update: TestProcessUpdate,
  definition: ProcessDefinition,
  receivedAt: number
): ProcessTesterTimelineItem[] {
  const items: ProcessTesterTimelineItem[] = [];

  if (update.currentStepId) {
    const step = new DefinitionWalker().findById(definition, update.currentStepId);
    if (step) {
      items.push(new CurrentStepProcessTesterTimelineItem(receivedAt, step.id, step.name));
    }
  }

  if (update.log) {
    const [time, level, message] = update.log;
    items.push(new LogProcessTesterTimelineItem(time, level, message));
  }

  const outcome = update.outcome;
  if (!outcome) {
    return items;
  }
  if (outcome.type === ProcessExecutionOutcomeType.FAILED) {
    items.push(new ErrorProcessTesterTimelineItem(receivedAt, 'Process failed', outcome.error));
    return items;
  }
  if (outcome.type === ProcessExecutionOutcomeType.PAUSED) {
    items.push(new LogProcessTesterTimelineItem(receivedAt, ProcessLogLevel.INFO, 'Process paused'));
    return items;
  }

  const step = outcome.interruptedStepId ? new DefinitionWalker().findById(definition, outcome.interruptedStepId) : null;
  const returnStep = step?.type === 'return' ? (step as ReturnStep) : null;
  if (returnStep?.properties.outputForm) {
    items.push(
      new FormProcessTesterTimelineItem(
        receivedAt,
        ProcessTesterTimelineFormType.OUTPUT,
        ProcessTesterTimelineFormStatus.COMPLETED,
        returnStep.properties.outputForm,
        outcome.output
      )
    );
  } else {
    items.push(new OutputProcessTesterTimelineItem(receivedAt, outcome.output));
  }

  return items;
}
