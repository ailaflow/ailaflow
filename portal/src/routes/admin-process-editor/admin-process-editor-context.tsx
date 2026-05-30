import { ProcessDefinition } from '@aila/model';
import { useReducer } from 'react';
import { useContext } from 'react';
import { createContext } from 'react';
import { wrapDefinition, WrappedDefinition } from 'sequential-workflow-designer-react';

export enum AdminProcessEditorMode {
  DESIGNER,
  SCHEMA_EDITOR
}

export interface EditorDataState {
  mode: AdminProcessEditorMode;
  definition: WrappedDefinition<ProcessDefinition>;
  path?: string;
}

export interface AdminProcessEditorState extends EditorDataState {
  setDefinition(definition: WrappedDefinition): void;
  switchToDesigner(): void;
  switchToSchemaEditor(path: string): void;
}

export function useAdminProcessEditor(): AdminProcessEditorState {
  const context = useContext(adminProcessEditorContext);
  if (!context) {
    throw new Error('Cannot find admin process editor context');
  }
  return context;
}

const adminProcessEditorContext = createContext<AdminProcessEditorState | null>(null);

function stateInitializer(): EditorDataState {
  const definition = wrapDefinition<ProcessDefinition>({
    properties: {
      variables: []
    },
    sequence: []
  });
  return {
    mode: AdminProcessEditorMode.DESIGNER,
    path: undefined,
    definition
  };
}

function staterReducer(state: EditorDataState, delta: Partial<EditorDataState>): EditorDataState {
  return { ...state, ...delta };
}

export function AdminProcessEditorContext(props: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(staterReducer, undefined, stateInitializer);

  function setDefinition(newDefinition: WrappedDefinition<ProcessDefinition>) {
    dispatch({
      mode: AdminProcessEditorMode.DESIGNER,
      definition: newDefinition
    });
  }

  function switchToDesigner() {
    dispatch({
      mode: AdminProcessEditorMode.DESIGNER
    });
  }

  function switchToSchemaEditor(path: string) {
    dispatch({
      mode: AdminProcessEditorMode.SCHEMA_EDITOR,
      path
    });
  }

  return (
    <adminProcessEditorContext.Provider value={{ ...state, setDefinition, switchToDesigner, switchToSchemaEditor }}>
      {props.children}
    </adminProcessEditorContext.Provider>
  );
}
