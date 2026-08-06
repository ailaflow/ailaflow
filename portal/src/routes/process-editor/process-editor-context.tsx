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
import { DefinitionWalker, Step } from 'sequential-workflow-model';
import { DefinitionPath, DefinitionPathValue } from '../../core/definition-path';
import { DesignerUtils } from './designer-utils';
import { ObjectCloner } from 'sequential-workflow-designer';

export enum ProcessEditorOverlayType {
  SCHEMA_EDITOR = 'schemaEditor',
  FORM_EDITOR = 'formEditor',
  SCRIPT_EDITOR = 'scriptEditor'
}

export interface ProcessEditorData {
  overlay?: {
    type: ProcessEditorOverlayType;
    path: string;
    state?: unknown;
  };

  controller: SequentialWorkflowDesignerController;
  variableValidator: VariableCachedValidator;
  rootValidator: ProcessRootValidator;
  stepValidator: ProcessStepValidator;
  walker: DefinitionWalker;
  sandboxes: SandboxLiteDto[];

  isDirty: boolean;
  isNew: boolean;
  name: string;
  nameError: string | null;
  description: string;
  descriptionError: string | null;
  userAccessExpression: string;
  userAccessExpressionError: string | null;
  definition: WrappedDefinition<ProcessDefinition>;
  selectedStepId: string | null;
}

export interface ProcessEditorState extends ProcessEditorData {
  isValid: boolean;
  setIsDirty(isDirty: boolean): void;
  setName(name: string, throwIfInvalid: boolean): void;
  setDescription(description: string, throwIfInvalid: boolean): void;
  setUserAccessExpression(userAccessExpression: string, throwIfInvalid: boolean): void;
  setDefinition(definition: WrappedDefinition, markDirty: boolean): void;
  getStep<S extends Step>(id: string, requiredType?: S['type']): S;
  notifyDefinitionChange(): void;
  setSelectedStepId(stepId: string | null): void;
  closeOverlay(): void;
  openOverlay(type: ProcessEditorOverlayType, path: string): void;
  getOverlayObject<T>(type: ProcessEditorOverlayType): DefinitionPathValue<T>;
  getOverlayState<T>(create?: () => T): T;
  setOverlayState<T>(state: T): void;
}

export function useProcessEditor(): ProcessEditorState {
  const context = useContext(processEditorContext);
  if (!context) {
    throw new Error('Cannot find process editor context');
  }
  return context;
}

const processEditorContext = createContext<ProcessEditorState | null>(null);

function createData(props: Omit<ProcessEditorContextProps, 'children'>): ProcessEditorData {
  const sandboxNames = props.sandboxes.map(sandbox => sandbox.name);
  const variableValidator = new VariableCachedValidator();
  const rootValidator = new ProcessRootValidator(variableValidator);
  const stepValidator = new ProcessStepValidator(sandboxNames, variableValidator);

  const definition = wrapDefinition<ProcessDefinition>(props.process ? props.process.definition : DesignerUtils.createBlankDefinition());
  const name = props.process?.name ?? 'new_process';
  const description = props.process?.description ?? '';
  const userAccessExpression = props.process?.userAccessExpression ?? '';
  const controller = SequentialWorkflowDesignerController.create();

  return {
    sandboxes: props.sandboxes,

    controller,
    variableValidator,
    rootValidator,
    stepValidator,
    walker: new DefinitionWalker(),

    isNew: !props.process,
    name,
    nameError: ProcessValidator.validateName(name),
    description,
    descriptionError: ProcessValidator.validateDescription(description),
    userAccessExpression,
    userAccessExpressionError: null,
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
    const isValid =
      data.nameError === null &&
      data.descriptionError === null &&
      data.userAccessExpressionError === null &&
      data.definition.isValid !== false;

    function setIsDirty(isDirty: boolean) {
      update({
        isDirty
      });
    }

    function setName(name: string, throwIfInvalid: boolean) {
      const nameError = ProcessValidator.validateName(name);
      if (nameError && throwIfInvalid) {
        throw new Error(`Invalid name: ${nameError}`);
      }
      update({
        name,
        nameError,
        isDirty: true
      });
    }

    function setDescription(description: string, throwIfInvalid: boolean) {
      const descriptionError = ProcessValidator.validateDescription(description);
      if (descriptionError && throwIfInvalid) {
        throw new Error(`Invalid description: ${descriptionError}`);
      }
      update({
        description,
        descriptionError,
        isDirty: true
      });
    }

    function setUserAccessExpression(userAccessExpression: string, throwIfInvalid: boolean) {
      const userAccessExpressionError = ProcessValidator.validateUserAccessExpression(userAccessExpression);
      if (userAccessExpressionError && throwIfInvalid) {
        throw new Error(`Invalid user access expression: ${userAccessExpressionError}`);
      }
      update({
        userAccessExpression,
        userAccessExpressionError,
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
      // TODO: the designer should support also controller.updateEditor() that would refresh the content of the editor.
      // if (data.controller.isReady()) {
      //   data.controller.updateRootComponent();
      //   data.controller.updateBadges();
      // }
      // Then we don't need to clone the definition.
      const definition = ObjectCloner.deepClone(data.definition.value);
      update({
        definition: wrapDefinition(definition),
        isDirty: true
      });
    }

    function getStep<S extends Step>(id: string, requiredType?: S['type']): S {
      const step = state.walker.findById(state.definition.value, id);
      if (!step) {
        throw new Error(`Cannot find step with id: ${id}`);
      }
      if (requiredType && step.type !== requiredType) {
        throw new Error(`Step with id: ${id} is not of type: ${requiredType}`);
      }
      return step as S;
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

    function getOverlayState<T>(create?: () => T): T {
      if (!data.overlay) {
        throw new Error('No overlay is open');
      }
      if (!data.overlay.state) {
        if (!create) {
          throw new Error('The overlay state is not available');
        }
        data.overlay.state = create();
      }
      return data.overlay.state as T;
    }

    function setOverlayState<T>(state: T) {
      if (!data.overlay) {
        throw new Error('No overlay is open');
      }
      data.overlay.state = state;
      update({
        overlay: data.overlay
      });
    }

    return {
      ...data,
      isValid,
      setIsDirty,
      setName,
      setDescription,
      setUserAccessExpression,
      setDefinition,
      notifyDefinitionChange,
      getStep,
      setSelectedStepId,
      closeOverlay,
      openOverlay,
      getOverlayObject,
      getOverlayState,
      setOverlayState
    };
  }, [data]);

  return <processEditorContext.Provider value={state}>{props.children}</processEditorContext.Provider>;
}
