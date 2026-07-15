import {
  SandboxLiteDto,
  ProcessDefinition,
  ProcessDto,
  ProcessStepValidator,
  ProcessRootValidator,
  ProcessValidator,
  VariableCachedValidator
} from '@aila/model';
import { useMemo, useReducer } from 'react';
import { useContext } from 'react';
import { createContext } from 'react';
import { SequentialWorkflowDesignerController, wrapDefinition, WrappedDefinition } from 'sequential-workflow-designer-react';
import { DefinitionWalker } from 'sequential-workflow-model';
import { DefinitionPath, DefinitionPathValue } from '../../core/definition-path';

export enum ProcessEditorOverlayType {
  SCHEMA_EDITOR = 'schemaEditor',
  FORM_EDITOR = 'formEditor',
  SCRIPT_EDITOR = 'scriptEditor'
}

export interface ProcessEditorData {
  overlay?: {
    type: ProcessEditorOverlayType;
    path: string;
  };

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

export interface ProcessEditorState extends ProcessEditorData {
  isValid: boolean;
  setIsDirty(isDirty: boolean): void;
  setName(name: string): void;
  setDescription(description: string): void;
  setDefinition(definition: WrappedDefinition, markDirty: boolean): void;
  notifyDefinitionChange(): void;
  setSelectedStepId(stepId: string | null): void;
  closeOverlay(): void;
  openOverlay(type: ProcessEditorOverlayType, path: string): void;
  getOverlayObject<T>(assertType: ProcessEditorOverlayType): DefinitionPathValue<T>;
}

export function useProcessEditor(): ProcessEditorState {
  const context = useContext(processEditorContext);
  if (!context) {
    throw new Error('Cannot find process editor context');
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

function createData(props: Omit<ProcessEditorContextProps, 'children'>): ProcessEditorData {
  const sandboxNames = props.sandboxes.map(sandbox => sandbox.name);
  const variableValidator = new VariableCachedValidator();
  const rootValidator = new ProcessRootValidator(variableValidator);
  const stepValidator = new ProcessStepValidator(sandboxNames, variableValidator);

  const definition = wrapDefinition<ProcessDefinition>(props.process ? props.process.definition : createEmptyDefinition());
  const name = props.process?.name ?? 'new_process';
  const description = props.process?.description ?? '';
  const controller = SequentialWorkflowDesignerController.create();

  return {
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

function reduceState(state: ProcessEditorData, delta: Partial<ProcessEditorData>): ProcessEditorData {
  return { ...state, ...delta };
}

export interface ProcessEditorContextProps {
  process?: ProcessDto;
  sandboxes: SandboxLiteDto[];
  children: React.ReactNode;
}

export function ProcessEditorContext(props: ProcessEditorContextProps) {
  const [data, update] = useReducer(reduceState, undefined, () => createData(props));

  const state = useMemo<ProcessEditorState>(() => {
    const isValid = data.nameError === null && data.descriptionError === null && data.definition.isValid !== false;

    function setIsDirty(isDirty: boolean) {
      update({
        isDirty
      });
    }

    function setName(name: string) {
      update({
        name,
        nameError: ProcessValidator.validateName(name),
        isDirty: true
      });
    }

    function setDescription(description: string) {
      update({
        description,
        descriptionError: ProcessValidator.validateDescription(description),
        isDirty: true
      });
    }

    function setDefinition(newDefinition: WrappedDefinition<ProcessDefinition>, markDirty: boolean) {
      const delta: Partial<ProcessEditorData> = {
        definition: newDefinition
      };
      if (markDirty) {
        delta.isDirty = true;
      }
      update(delta);
    }

    function notifyDefinitionChange() {
      if (data.controller.isReady()) {
        data.controller.updateRootComponent();
        data.controller.updateBadges();
      }
      update({
        definition: wrapDefinition(data.definition.value),
        isDirty: true
      });
    }

    function setSelectedStepId(stepId: string | null) {
      update({
        selectedStepId: stepId
      });
    }

    function closeOverlay() {
      update({
        overlay: undefined
      });
    }

    function openOverlay(type: ProcessEditorOverlayType, path: string) {
      update({
        overlay: { type, path }
      });
    }

    function getOverlayObject<T>(assertType: ProcessEditorOverlayType): DefinitionPathValue<T> {
      if (!data.overlay || data.overlay.type !== assertType) {
        throw new Error(`${assertType} is not opened`);
      }
      return DefinitionPath.readPath<T>(data.definition.value, data.overlay.path);
    }

    return {
      ...data,
      isValid,
      setIsDirty,
      setName,
      setDescription,
      setDefinition,
      notifyDefinitionChange,
      setSelectedStepId,
      closeOverlay,
      openOverlay,
      getOverlayObject
    };
  }, [data]);

  return <processEditorContext.Provider value={state}>{props.children}</processEditorContext.Provider>;
}
