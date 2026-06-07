import { ContainerLiteDto, ProcessDefinition, ProcessDto, ProcessStepValidator, ProcessRootValidator, ProcessValidator } from '@aila/model';
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
  subPath?: string;

  rootValidator: ProcessRootValidator;
  stepValidator: ProcessStepValidator;
  containerNames: string[];

  isDirty: boolean;
  id?: string;
  name: string;
  nameError: string | null;
  description: string;
  descriptionError: string | null;
  definition: WrappedDefinition<ProcessDefinition>;
  selectedStepId: string | null;
}

export interface ProcessEditorState extends EditorDataState {
  isValid: boolean;
  setDirtyFalse(): void;
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

function createState(props: Omit<ProcessEditorContextProps, 'children'>): EditorDataState {
  const containerNames = props.containers.map(c => c.name);
  const rootValidator = new ProcessRootValidator();
  const stepValidator = new ProcessStepValidator(containerNames);

  const definition = wrapDefinition<ProcessDefinition>(props.process ? props.process.definition : createEmptyDefinition());
  const name = props.process?.name ?? 'new_process';
  const description = props.process?.description ?? '';
  return {
    mode: ProcessEditorMode.DESIGNER,

    rootValidator,
    stepValidator,
    containerNames,

    id: props.process?.id,
    name,
    nameError: ProcessValidator.validateName(name),
    description,
    descriptionError: ProcessValidator.validateDescription(description),
    selectedStepId: null,
    definition,
    isDirty: props.process ? false : true
  };
}

function reduceState(state: EditorDataState, delta: Partial<EditorDataState>): EditorDataState {
  return { ...state, ...delta };
}

export interface ProcessEditorContextProps {
  process?: ProcessDto;
  containers: ContainerLiteDto[];
  children: React.ReactNode;
}

export function ProcessEditorContext(props: ProcessEditorContextProps) {
  const [state, dispatch] = useReducer(reduceState, undefined, () => createState(props));
  const isValid = state.nameError === null && state.descriptionError === null && state.definition.isValid === true;

  function setDirtyFalse() {
    dispatch({
      isDirty: false
    });
  }

  function setName(name: string) {
    dispatch({
      name,
      nameError: ProcessValidator.validateName(name),
      isDirty: true
    });
  }

  function setDescription(description: string) {
    dispatch({
      description,
      descriptionError: ProcessValidator.validateDescription(description),
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

  function switchToSchemaEditor(subPath: string) {
    dispatch({
      mode: ProcessEditorMode.SCHEMA_EDITOR,
      subPath
    });
  }

  function switchToFormEditor(subPath: string) {
    dispatch({
      mode: ProcessEditorMode.FORM_EDITOR,
      subPath
    });
  }

  function switchToScriptEditor(subPath: string) {
    dispatch({
      mode: ProcessEditorMode.SCRIPT_EDITOR,
      subPath
    });
  }

  return (
    <processEditorContext.Provider
      value={{
        ...state,
        isValid,
        setDirtyFalse,
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
