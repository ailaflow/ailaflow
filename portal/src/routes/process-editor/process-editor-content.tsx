import { ProcessEditorChildRoute, useProcessEditor } from './process-editor-context';
import { SchemaSubEditor } from './sub-editors/schema-sub-editor';
import { DesignerSubEditor } from './sub-editors/designer-sub-editor';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router-dom';
import { FormSubEditor } from './sub-editors/form-sub-editor';
import { ScriptSubEditor } from './sub-editors/script-sub-editor';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { fnv1a } from '../../core/fnv1a';
import { useAiStore } from '../common/ai-bindings/ai-bindings-context';
import { anyStepSchema, FormDefinition, ProcessValidator, TaskStep } from '@aila/model';
import { toolError, toolSuccess } from '../common/ai-bindings/ai-tool-results';
import { createEmptyFormDefinition, toolboxConfiguration } from './designer-configuration';
import { ObjectCloner, Step, Uid } from 'sequential-workflow-designer';
import { DefinitionPath } from '../../core/definition-path';
import { wrapDefinition } from 'sequential-workflow-designer-react';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = state.childRoute === ProcessEditorChildRoute.DESIGNER;
  const canSave = Boolean(state.isValid && state.isDirty);
  const canTest = Boolean(state.isValid && !state.isDirty);

  function openTester() {
    navigate(`/admin/processes/${state.id}/test`);
  }

  async function save() {
    if (!canSave) {
      return;
    }

    const timeout = AbortSignal.timeout(5_000);
    const hash = fnv1a(state.definition.value);
    const response = await apiClient.process.updateProcess(timeout, {
      id: state.id,
      description: state.description,
      name: state.name,
      userList: '',
      definition: state.definition.value,
      hash
    });

    if (state.id) {
      state.setIsDirty(false);
    } else {
      navigate(`/admin/processes/${response.id}`);
    }
  }

  useAiStore(
    stores =>
      stores.processEditor.bind({
        async processEditor_getDetails() {
          return {
            name: state.name,
            description: state.description
          };
        },
        async processEditor_setName(arg) {
          const error = ProcessValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setName(arg.name);
          return toolSuccess('Name updated');
        },
        async processEditor_setDescription(arg) {
          const error = ProcessValidator.validateDescription(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setDescription(arg.name);
          return toolSuccess('Description updated');
        },
        async processEditor_getAvailableNewSteps() {
          return toolboxConfiguration.groups
            .flatMap(group => group.steps)
            .map(step => ({
              type: step.type,
              defaultName: step.name
            }));
        },
        processEditor_getWorkflow: async () => {
          const definition = ObjectCloner.deepClone(state.definition.value);
          state.walker.forEach(definition, step => {
            const s = step as { properties?: unknown };
            delete s.properties;
          });
          return definition;
        },
        processEditor_readWorkflowStep: async arg => {
          const step = state.walker.findById(state.definition.value, arg.stepId);
          if (!step) {
            return toolError('Step ID not found');
          }
          return step;
        },
        processEditor_deleteWorkflowStep: async arg => {
          const found = state.walker.findParentSequence(state.definition.value, arg.stepId);
          if (!found) {
            return toolError('Step ID not found. The step was not deleted.');
          }
          found.parentSequence.splice(found.index, 1);
          state.notifyDefinitionChange();
          return toolSuccess('Step deleted');
        },
        processEditor_createWorkflowStep: async arg => {
          const template = toolboxConfiguration.groups.flatMap(group => group.steps).find(step => step.type === arg.type);
          if (!template) {
            return toolError('Step type not found');
          }
          const newStep = ObjectCloner.deepClone(template) as Step;
          newStep.id = Uid.next();
          newStep.name = arg.name;
          return newStep;
        },
        processEditor_appendWorkflowStep: async arg => {
          const parseResult = anyStepSchema.safeParse(arg.step);
          if (!parseResult.success) {
            return toolError(`Invalid step JSON: ${parseResult.error.message}. The step was not added.`);
          }
          const found = state.walker.findParentSequence(state.definition.value, arg.targetStepId);
          if (!found) {
            return toolError('Step ID not found. The step was not added.');
          }
          found.parentSequence.splice(arg.placement === 'before' ? found.index : found.index + 1, 0, arg.step);

          state.notifyDefinitionChange();
          return toolSuccess('Workflow updated');
        },
        processEditor_replaceWorkflowStep: async arg => {
          const parseResult = anyStepSchema.safeParse(arg.step);
          if (!parseResult.success) {
            return toolError(`Invalid step JSON: ${parseResult.error.message}. The step was not replaced.`);
          }
          const found = state.walker.findParentSequence(state.definition.value, arg.step.id);
          if (!found) {
            return toolError('Step ID not found. The step was not replaced.');
          }
          found.parentSequence[found.index] = arg.step;

          state.notifyDefinitionChange();
          return toolSuccess('Workflow updated');
        },
        processEditor_getRootVariables: async () => {
          return state.definition.value.properties.variables;
        },
        processEditor_isRootStartFormEnabled: async () => {
          return {
            isEnabled: Boolean(state.definition.value.properties.startForm)
          };
        },
        processEditor_switchRootStartForm: async arg => {
          state.definition.value.properties.startForm = arg.isEnabled ? createEmptyFormDefinition() : undefined;
          state.notifyDefinitionChange();
          return toolSuccess(`Start form ${arg.isEnabled ? 'enabled' : 'disabled'}`);
        },
        processEditor_openRootStartFormEditor: async () => {
          if (!state.definition.value.properties.startForm) {
            return toolError('Start form is not enabled.');
          }
          state.switchToChildRoute(ProcessEditorChildRoute.FORM_EDITOR, DefinitionPath.createRootPath('properties.startForm'));
          return toolSuccess('Start form editor opened');
        },
        processEditor_openDesigner: async () => {
          if (state.childRoute === ProcessEditorChildRoute.DESIGNER) {
            return toolError('Designer is already open.');
          }
          state.switchToDesigner();
          return toolSuccess('Designer opened');
        },
        processEditor_getChildRoute: async () => {
          if (state.childRoute === ProcessEditorChildRoute.DESIGNER) {
            return {
              mode: ProcessEditorChildRoute.DESIGNER
            };
          }
          const { stepId, pathParts } = DefinitionPath.parsePath(state.definition.value, state.childPath!);
          return {
            mode: state.childRoute,
            stepId,
            isRoot: stepId === null,
            path: pathParts.join('.')
          };
        },

        processEditor_formEditor_getAvailableVariables: async () => {
          if (state.childRoute !== ProcessEditorChildRoute.FORM_EDITOR || !state.childPath) {
            return toolError('Form editor is not open.');
          }
          const { isRoot, object } = DefinitionPath.readPath<FormDefinition>(state.definition.value, state.childPath!);
          const inputVariableNames = isRoot ? [] : (object as TaskStep).properties.inputVariableNames;
          const outputVariableNames = isRoot ? [] : (object as TaskStep).properties.outputVariableNames;
          return {
            inputVariableNames,
            outputVariableNames
          };
        },
        processEditor_formEditor_get: async arg => {
          if (state.childRoute !== ProcessEditorChildRoute.FORM_EDITOR || !state.childPath) {
            return toolError('Form editor is not open.');
          }
          const { value } = DefinitionPath.readPath<FormDefinition>(state.definition.value, state.childPath);
          return {
            value: value[arg.type]
          };
        },
        processEditor_formEditor_set: async arg => {
          if (state.childRoute !== ProcessEditorChildRoute.FORM_EDITOR || !state.childPath) {
            return toolError('Form editor is not open.');
          }
          const { value } = DefinitionPath.readPath<FormDefinition>(state.definition.value, state.childPath);
          value[arg.type] = arg.value;
          state.setDefinition(wrapDefinition(state.definition.value), true);
          return toolSuccess('Form content updated');
        }
      }),
    [state]
  );

  return (
    <ResourceEditorView
      icon="/"
      name={state.name}
      isNameValid={state.nameError === null}
      isNameReadOnly={!isDesigner}
      onNameChange={state.setName}
      detailsId="admin-process-editor-details"
      details={
        isDesigner ? (
          <ResourceSimpleDetailsView
            id="admin-process-editor-details"
            description={state.description}
            descriptionError={state.descriptionError}
            onDescriptionChange={state.setDescription}
          />
        ) : undefined
      }
      areDetailsVisible={isDesigner}
      canSave={canSave}
      onSave={isDesigner ? save : undefined}
      switchLabel="Test"
      canSwitch={canTest}
      onSwitch={isDesigner ? openTester : undefined}
    >
      {isDesigner && <DesignerSubEditor />}
      {state.childRoute === ProcessEditorChildRoute.SCHEMA_EDITOR && <SchemaSubEditor />}
      {state.childRoute === ProcessEditorChildRoute.FORM_EDITOR && <FormSubEditor />}
      {state.childRoute === ProcessEditorChildRoute.SCRIPT_EDITOR && <ScriptSubEditor />}
    </ResourceEditorView>
  );
}
