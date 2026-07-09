import {
  SandboxLiteDto,
  ProcessDefinition,
  ProcessDto,
  ProcessStepValidator,
  ProcessRootValidator,
  ProcessValidator,
  VariableCachedValidator
} from '@aila/model';
import { useReducer } from 'react';
import { useContext } from 'react';
import { createContext } from 'react';
import { SequentialWorkflowDesignerController, wrapDefinition, WrappedDefinition } from 'sequential-workflow-designer-react';
import { DefinitionWalker } from 'sequential-workflow-model';

export enum ProcessEditorChildRoute {
  DESIGNER = 'designer',
  SCHEMA_EDITOR = 'schema-editor',
  FORM_EDITOR = 'form-editor',
  SCRIPT_EDITOR = 'script-editor'
}

export interface EditorDataState {
  childRoute: ProcessEditorChildRoute;
  childPath?: string;

  controller: SequentialWorkflowDesignerController;
  variableValidator: VariableCachedValidator;
  rootValidator: ProcessRootValidator;
  stepValidator: ProcessStepValidator;
  walker: DefinitionWalker;
  sandboxNames: string[];

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
  setIsDirty(isDirty: boolean): void;
  setName(name: string): void;
  setDescription(description: string): void;
  setDefinition(definition: WrappedDefinition, markDirty: boolean): void;
  notifyDefinitionChange(): void;
  setSelectedStepId(stepId: string | null): void;
  switchToDesigner(): void;
  switchToChildRoute(childRoute: ProcessEditorChildRoute, path: string): void;
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
      startVariableNames: [],
      variables: []
    },
    sequence: []
  };
}

function createState(props: Omit<ProcessEditorContextProps, 'children'>): EditorDataState {
  const sandboxNames = props.sandboxes.map(sandbox => sandbox.name);
  const variableValidator = new VariableCachedValidator();
  const rootValidator = new ProcessRootValidator(variableValidator);
  const stepValidator = new ProcessStepValidator(sandboxNames, variableValidator);

  const definition = wrapDefinition<ProcessDefinition>(props.process ? props.process.definition : createEmptyDefinition());
  const name = props.process?.name ?? 'new_process';
  const description = props.process?.description ?? '';
  const controller = SequentialWorkflowDesignerController.create();

  return {
    childRoute: ProcessEditorChildRoute.DESIGNER,

    controller,
    variableValidator,
    rootValidator,
    stepValidator,
    walker: new DefinitionWalker(),
    sandboxNames,

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
  sandboxes: SandboxLiteDto[];
  children: React.ReactNode;
}

export function ProcessEditorContext(props: ProcessEditorContextProps) {
  const [state, dispatch] = useReducer(reduceState, undefined, () => createState(props));
  const isValid = state.nameError === null && state.descriptionError === null && state.definition.isValid !== false;

  function setIsDirty(isDirty: boolean) {
    dispatch({
      isDirty
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

  function setDefinition(newDefinition: WrappedDefinition<ProcessDefinition>, markDirty: boolean) {
    const delta: Partial<EditorDataState> = {
      definition: newDefinition
    };
    if (markDirty) {
      delta.isDirty = true;
    }
    dispatch(delta);
  }

  function notifyDefinitionChange() {
    if (state.controller.isReady()) {
      state.controller.updateRootComponent();
      state.controller.updateBadges();
    }
    dispatch({
      isDirty: true
    });
  }

  function setSelectedStepId(stepId: string | null) {
    dispatch({
      selectedStepId: stepId
    });
  }

  function switchToDesigner() {
    dispatch({
      childRoute: ProcessEditorChildRoute.DESIGNER
    });
  }

  function switchToChildRoute(childRoute: ProcessEditorChildRoute, childPath: string) {
    dispatch({
      childRoute,
      childPath
    });
  }

  return (
    <processEditorContext.Provider
      value={{
        ...state,
        isValid,
        setIsDirty: setIsDirty,
        setName,
        setDescription,
        setDefinition,
        notifyDefinitionChange,
        setSelectedStepId,
        switchToDesigner,
        switchToChildRoute
      }}
    >
      {props.children}
    </processEditorContext.Provider>
  );
}
