import { ProcessDefinition, ProcessDto, ProcessValidator } from '@aila/model';
import { useReducer } from 'react';
import { useContext } from 'react';
import { createContext } from 'react';
import { wrapDefinition, WrappedDefinition } from 'sequential-workflow-designer-react';

export enum ProcessEditorMode {
  DESIGNER,
  SCHEMA_EDITOR,
  FORM_EDITOR,
  SCRIPT_EDITOR
}

export interface EditorDataState {
  mode: ProcessEditorMode;
  id?: string;
  name: string;
  isNameValid: boolean;
  description: string;
  definition: WrappedDefinition<ProcessDefinition>;
  selectedStepId: string | null;
  path?: string;
  isDirty: boolean;
}

export interface ProcessEditorState extends EditorDataState {
  setId(id: string, isDirty: boolean): void;
  setName(name: string): void;
  setDescription(description: string): void;
  setDefinition(definition: WrappedDefinition): void;
  setSelectedStepId(stepId: string | null): void;
  switchToDesigner(): void;
  switchToSchemaEditor(path: string): void;
  switchToFormEditor(path: string): void;
  switchToScriptEditor(path: string): void;
}

export function useProcessEditor(): ProcessEditorState {
  const context = useContext(processEditorContext);
  if (!context) {
    throw new Error('Cannot find admin process editor context');
  }
  return context;
}

const processEditorContext = createContext<ProcessEditorState | null>(null);

function createEmptyDefinition(): ProcessDefinition {
  return {
    properties: {
      variables: []
    },
    sequence: []
  };
}

function createState(process?: ProcessDto): EditorDataState {
  const definition = wrapDefinition<ProcessDefinition>(process ? process.definition : createEmptyDefinition());
  const name = process?.name ?? 'new_process';
  return {
    mode: ProcessEditorMode.DESIGNER,
    id: process?.id,
    name,
    isNameValid: !ProcessValidator.validateName(name),
    description: process?.description ?? '',
    selectedStepId: null,
    definition,
    isDirty: process ? false : true
  };
}

function reduceState(state: EditorDataState, delta: Partial<EditorDataState>): EditorDataState {
  return { ...state, ...delta };
}

export function ProcessEditorContext(props: { children: React.ReactNode; process?: ProcessDto }) {
  const [state, dispatch] = useReducer(reduceState, undefined, () => createState(props.process));

  function setId(id: string, isDirty: boolean) {
    dispatch({
      id,
      isDirty
    });
  }

  function setName(name: string) {
    dispatch({
      name,
      isNameValid: !ProcessValidator.validateName(name),
      isDirty: true
    });
  }

  function setDescription(description: string) {
    dispatch({
      description,
      isDirty: true
    });
  }

  function setDefinition(newDefinition: WrappedDefinition<ProcessDefinition>) {
    const delta: Partial<EditorDataState> = {
      definition: newDefinition
    };
    // When designer starts it validates the definition and sets isValid, we need to skip setting isDirty until that happens.
    if (state.definition.isValid !== undefined) {
      delta.isDirty = true;
    }
    dispatch(delta);
  }

  function setSelectedStepId(stepId: string | null) {
    dispatch({
      selectedStepId: stepId
    });
  }

  function switchToDesigner() {
    dispatch({
      mode: ProcessEditorMode.DESIGNER
    });
  }

  function switchToSchemaEditor(path: string) {
    dispatch({
      mode: ProcessEditorMode.SCHEMA_EDITOR,
      path
    });
  }

  function switchToFormEditor(path: string) {
    dispatch({
      mode: ProcessEditorMode.FORM_EDITOR,
      path
    });
  }

  function switchToScriptEditor(path: string) {
    dispatch({
      mode: ProcessEditorMode.SCRIPT_EDITOR,
      path
    });
  }

  return (
    <processEditorContext.Provider
      value={{
        ...state,
        setId,
        setName,
        setDescription,
        setDefinition,
        setSelectedStepId,
        switchToDesigner,
        switchToSchemaEditor,
        switchToFormEditor,
        switchToScriptEditor
      }}
    >
      {props.children}
    </processEditorContext.Provider>
  );
}
