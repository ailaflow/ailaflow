import { ProcessLogLevel, type ProcessDefinition, type ProcessDto, type ReturnStep, type TestProcessUpdate } from '@aila/model';
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { DefinitionWalker } from 'sequential-workflow-model';
import { useApiClient, useSession } from '../../auth/auth-context';
import {
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
  startFormData: Record<string, unknown> | null;
  timelineItems: ProcessTesterTimelineItem[];
  currentUserName: string;
  chatUserNames: string[];
  activeChatUserName: string;
}

export interface ProcessTesterState extends ProcessTesterData {
  submitStartForm(data: Record<string, unknown>): void;
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
  const [data, update] = useReducer(reduceState, undefined, () => createData(props.process, session.userName));

  useEffect(() => {
    if (!data.startFormData) {
      return;
    }
    const abortController = new AbortController();

    async function test() {
      try {
        await apiClient.process.testProcess(
          abortController.signal,
          {
            onMessage(testUpdate) {
              update(state => {
                const timelineItems = createProcessTesterTimelineItems(
                  testUpdate,
                  state.process.definition,
                  Date.now()
                );
                return { timelineItems: [...state.timelineItems, ...timelineItems] };
              });
            },
            onClose() {
              update(state => {
                const time = Date.now();
                const item = new LogProcessTesterTimelineItem(
                  time,
                  ProcessLogLevel.INFO,
                  'Connection closed'
                );
                return { timelineItems: [...state.timelineItems, item] };
              });
            }
          },
          data.process.name,
          { input: data.startFormData! }
        );
      } catch (e) {
        if (!abortController.signal.aborted) {
          update(state => {
            const item = new ErrorProcessTesterTimelineItem(
              Date.now(),
              'Connection error',
              String(e)
            );
            return { timelineItems: [...state.timelineItems, item] };
          });
        }
      }
    }

    test();
    return () => abortController.abort();
  }, [apiClient, data.process.name, data.startFormData]);

  const state = useMemo<ProcessTesterState>(() => {
    function submitStartForm(startFormData: Record<string, unknown>) {
      update({
        startFormData,
        timelineItems: [
          new FormProcessTesterTimelineItem(
            Date.now(),
            ProcessTesterTimelineFormType.START,
            ProcessTesterTimelineFormStatus.COMPLETED
          )
        ]
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
      submitStartForm,
      openUserChat,
      selectUserChat,
      closeUserChat
    };
  }, [data]);

  return <processTesterContext.Provider value={state}>{props.children}</processTesterContext.Provider>;
}

type StateUpdate = Partial<ProcessTesterData> | ((state: ProcessTesterData) => Partial<ProcessTesterData>);

function reduceState(state: ProcessTesterData, stateUpdate: StateUpdate): ProcessTesterData {
  const delta = typeof stateUpdate === 'function' ? stateUpdate(state) : stateUpdate;
  return { ...state, ...delta };
}

function createData(process: ProcessDto, currentUserName: string): ProcessTesterData {
  return {
    process,
    startFormData: null,
    timelineItems: [
      new FormProcessTesterTimelineItem(
        Date.now(),
        ProcessTesterTimelineFormType.START,
        ProcessTesterTimelineFormStatus.ACTIVE
      )
    ],
    currentUserName,
    chatUserNames: [currentUserName],
    activeChatUserName: currentUserName
  };
}

function createProcessTesterTimelineItems(
  update: TestProcessUpdate,
  definition: ProcessDefinition,
  receivedAt: number
): ProcessTesterTimelineItem[] {
  const items: ProcessTesterTimelineItem[] = [];

  if (update.log) {
    const [time, level, message] = update.log;
    items.push(new LogProcessTesterTimelineItem(time, level, message));
  }

  if (!update.result) {
    return items;
  }
  if (!update.result.success) {
    items.push(new ErrorProcessTesterTimelineItem(receivedAt, 'Process failed', update.result.error));
    return items;
  }

  const result = update.result;
  const step = result.stepId ? new DefinitionWalker().findById(definition, result.stepId) : null;
  const returnStep = step?.type === 'return' ? (step as ReturnStep) : null;
  if (returnStep?.properties.outputForm) {
    items.push(
      new FormProcessTesterTimelineItem(
        receivedAt,
        ProcessTesterTimelineFormType.OUTPUT,
        ProcessTesterTimelineFormStatus.COMPLETED,
        returnStep.properties.outputForm,
        result.output
      )
    );
  } else {
    items.push(new OutputProcessTesterTimelineItem(receivedAt, result.output));
  }

  return items;
}
