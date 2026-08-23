import type { ProcessDto, TestProcessUpdate } from '@aila/model';
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { useApiClient, useSession } from '../../auth/auth-context';

export interface ProcessTesterData {
  process: ProcessDto;
  startFormData: Record<string, unknown> | null;
  updates: TestProcessUpdate[];
  error: string | null;
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
              update(state => ({ updates: [...state.updates, testUpdate] }));
            },
            onClose() {
              update(state => ({ updates: [...state.updates, { type: 'Connection closed' } as TestProcessUpdate] }));
            }
          },
          data.process.name,
          { input: data.startFormData! }
        );
      } catch (e) {
        if (!abortController.signal.aborted) {
          update({ error: String(e) });
        }
      }
    }

    test();
    return () => abortController.abort();
  }, [apiClient, data.process.name, data.startFormData]);

  const state = useMemo<ProcessTesterState>(() => {
    function submitStartForm(startFormData: Record<string, unknown>) {
      update({ startFormData, updates: [], error: null });
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
    updates: [],
    error: null,
    currentUserName,
    chatUserNames: [currentUserName],
    activeChatUserName: currentUserName
  };
}
