import { ProcessEditorOverlayType, useProcessEditor } from './process-editor-context';
import { SchemaEditorOverlay } from './overlays/schema-editor-overlay';
import { Designer } from './designer';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router-dom';
import { FormEditorOverlay } from './overlays/form-editor-overlay';
import { ScriptEditorOverlay, ScriptEditorOverlayState } from './overlays/script-editor-overlay';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { fnv1a } from '@aibindkit/core';
import { anyStepSchema, ScriptStep } from '@aila/model';
import { toolError, toolSuccess } from '@aibindkit/react';
import { createEmptyFormDefinition, toolboxConfiguration } from './designer-configuration';
import { BranchedStep, ObjectCloner, Sequence, SequentialStep, Step, Uid } from 'sequential-workflow-designer';
import { DefinitionPath } from '../../core/definition-path';
import { useAiStore, useUnsavedChangesController } from '../common/admin-portal';
import { FormEditorOverlayUtils } from './overlays/form-editor-overlay-utils';
import { ScriptEditorOverlayUtils } from './overlays/script-editor-overlay-utils';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = !state.overlay;
  const canSave = Boolean(state.isValid && state.isDirty);
  const canTest = Boolean(state.isValid && !state.isDirty);

  function openTester() {
    navigate(`/admin/processes/${state.name}/test`);
  }

  async function save() {
    if (!canSave) {
      return;
    }

    const timeout = AbortSignal.timeout(5_000);
    const hash = fnv1a(state.definition.value);
    const response = await apiClient.process.saveProcess(timeout, {
      insert: state.isNew,
      description: state.description,
      name: state.name,
      userAccessExpression: state.userAccessExpression,
      definition: state.definition.value,
      hash
    });

    if (state.isNew) {
      navigate(`/admin/processes/${response.name}`);
    } else {
      state.setIsDirty(false);
    }
  }

  useUnsavedChangesController(state.isDirty);

  useAiStore(
    'processEditor',
    store =>
      store.bind({
        async getProcessNameAndDescription() {
          return {
            name: state.name,
            description: state.description
          };
        },
        async setProcessName(arg) {
          if (!state.isNew) {
            return toolError('Saved process names cannot be changed');
          }
          state.setName(arg.name, true);
          return toolSuccess('Process name updated');
        },
        async setProcessDescription(arg) {
          state.setDescription(arg.name, true);
          return toolSuccess('Process description updated');
        },
        async getAvailableNewStepTypes() {
          return toolboxConfiguration.groups
            .flatMap(group => group.steps)
            .map(step => ({
              type: step.type,
              defaultName: step.name
            }));
        },
        async getSelectedStepId() {
          return state.selectedStepId ? { isSelected: true, stepId: state.selectedStepId } : { isSelected: false };
        },
        async getWorkflow() {
          const definition = ObjectCloner.deepClone(state.definition.value);
          for (const variable of definition.properties.variables) {
            const v = variable as { schema?: unknown };
            delete v.schema;
          }
          state.walker.forEach(definition, step => {
            const s = step as { properties?: unknown };
            delete s.properties;
          });
          return definition;
        },
        async readWorkflowStep(arg) {
          return state.getStep(arg.stepId);
        },
        async deleteWorkflowStep(arg) {
          const found = state.walker.findParentSequence(state.definition.value, arg.stepId);
          if (!found) {
            return toolError('No workflow step was found with the provided ID; no step was deleted');
          }
          found.parentSequence.splice(found.index, 1);
          state.notifyDefinitionChange();
          return toolSuccess('Workflow step deleted');
        },
        async renameWorkflowStep(arg) {
          const step = state.walker.findById(state.definition.value, arg.stepId);
          if (!step) {
            return toolError('No workflow step was found with the provided ID; no step was renamed');
          }
          step.name = arg.newName;
          state.notifyDefinitionChange();
          return toolSuccess('Workflow step renamed');
        },
        async createWorkflowStep(arg) {
          const template = toolboxConfiguration.groups.flatMap(group => group.steps).find(step => step.type === arg.type);
          if (!template) {
            return toolError('No available workflow step type matches the provided type');
          }
          const newStep = ObjectCloner.deepClone(template) as Step;
          newStep.id = Uid.next();
          newStep.name = arg.name;
          return newStep;
        },
        async insertWorkflowStep(arg) {
          const parseResult = anyStepSchema.safeParse(arg.step);
          if (!parseResult.success) {
            return toolError(`Invalid step JSON: ${parseResult.error.message}; no step was inserted`);
          }
          const found = state.walker.findParentSequence(state.definition.value, arg.targetStepId);
          if (!found) {
            return toolError('No target workflow step was found with the provided ID; no step was inserted');
          }
          found.parentSequence.splice(arg.placement === 'before' ? found.index : found.index + 1, 0, arg.step);

          state.notifyDefinitionChange();
          return toolSuccess('Workflow step inserted');
        },
        async replaceWorkflowStep(arg) {
          const parseResult = anyStepSchema.safeParse(arg.step);
          if (!parseResult.success) {
            return toolError(`Invalid step JSON: ${parseResult.error.message}; no step was replaced`);
          }
          const found = state.walker.findParentSequence(state.definition.value, arg.step.id);
          if (!found) {
            return toolError('No workflow step was found with the replacement step ID; no step was replaced');
          }
          found.parentSequence[found.index] = arg.step;

          state.notifyDefinitionChange();
          return toolSuccess('Workflow step replaced');
        },
        async appendWorkflowStep(arg) {
          const parseResult = anyStepSchema.safeParse(arg.step);
          if (!parseResult.success) {
            return toolError(`Invalid step JSON: ${parseResult.error.message}; no step was replaced`);
          }
          let sequence: Sequence;
          if (!arg.targetStepId) {
            sequence = state.definition.value.sequence;
          } else {
            const found = state.walker.findParentSequence(state.definition.value, arg.step.id);
            if (!found) {
              return toolError(`Cannot find the target step; no step was added`);
            }
            sequence = getStepSequence(found.step, arg.branchName);
          }
          sequence.push(arg.step);
          state.notifyDefinitionChange();
          return toolSuccess('Step was added');
        },
        async hasUnsavedChanges() {
          return {
            hasUnsavedChanges: state.isDirty
          };
        },
        async save() {
          if (!state.isDirty) {
            return toolError('All changes are already saved');
          }
          await save();
          return toolSuccess('All changes are saved');
        },

        // root

        async getRootVariables() {
          const variables = state.definition.value.properties.variables;
          return variables.map(v => ({
            name: v.name,
            description: v.description,
            schema: v.schema.schema
          }));
        },
        async getRootVariableSchema(arg) {
          const variable = state.definition.value.properties.variables.find(v => v.name === arg.variableName);
          if (!variable) {
            return toolError(`Cannot find \$${arg.variableName} variable`);
          }
          return {
            schema: variable.schema.schema
          };
        },
        async isRootStartFormEnabled() {
          return {
            isEnabled: Boolean(state.definition.value.properties.startForm)
          };
        },
        async setRootStartFormEnabled(arg) {
          state.definition.value.properties.startForm = arg.isEnabled ? createEmptyFormDefinition() : undefined;
          state.notifyDefinitionChange();
          return toolSuccess(`Process start form ${arg.isEnabled ? 'enabled' : 'disabled'}`);
        },
        async openRootStartFormEditorOverlay() {
          if (!state.definition.value.properties.startForm) {
            return toolError('Enable the process start form before opening its editor overlay');
          }
          state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, DefinitionPath.createRootPath('properties.startForm'));
          return toolSuccess('Process start form editor overlay opened');
        },
        async getRootStartVariables() {
          return {
            variableNames: state.definition.value.properties.startVariableNames
          };
        },
        async setRootStartVariables(arg) {
          for (const name of arg.variableNames) {
            const variable = state.definition.value.properties.variables.find(v => v.name === name);
            if (!variable) {
              return toolError(`Cannot find \$${name} variable; process start variable names were not updated`);
            }
          }
          state.definition.value.properties.startVariableNames = arg.variableNames;
          state.notifyDefinitionChange();
          return toolSuccess('Process start variable names updated');
        },

        // steps

        async scriptStep_openScriptEditorOverlay(arg) {
          const step = state.getStep<ScriptStep>(arg.stepId, 'script');
          const path = DefinitionPath.createStepPath(step.id, 'properties.script');
          state.openOverlay(ProcessEditorOverlayType.SCRIPT_EDITOR, path);
          return toolSuccess('Script editor overlay opened');
        },
        async scriptStep_getSandboxName(arg) {
          const step = state.getStep<ScriptStep>(arg.stepId, 'script');
          return {
            sandboxName: step.properties.script.sandboxName
          };
        },
        async scriptStep_setSandboxName(arg) {
          if (!state.sandboxNames.includes(arg.sandboxName)) {
            return toolError(`Sandbox name "${arg.sandboxName}" is not available`);
          }
          const step = state.getStep<ScriptStep>(arg.stepId, 'script');
          step.properties.script.sandboxName = arg.sandboxName;
          state.notifyDefinitionChange();
          return toolSuccess('Sandbox name updated');
        },

        // overlay

        async getCurrentOverlay() {
          if (!state.overlay) {
            return {
              isOpened: false
            };
          }
          const { stepId, pathParts } = DefinitionPath.parsePath(state.definition.value, state.overlay.path);
          return {
            isOpened: true,
            name: state.overlay.type,
            params: {
              isRoot: stepId === null,
              stepId,
              path: pathParts.join('.')
            }
          };
        },
        async closeOverlay() {
          if (!state.overlay) {
            return toolError('No overlay is currently open');
          }
          state.closeOverlay();
          return toolSuccess('Overlay closed');
        },

        // form editor

        async formEditor_getVariables() {
          const data = FormEditorOverlayUtils.getData(state);
          return {
            inputVariableNames: data.inputVariableNames,
            outputVariableNames: data.outputVariableNames
          };
        },
        async formEditor_getContent(arg) {
          const data = FormEditorOverlayUtils.getData(state);
          return {
            content: data.form[arg.part]
          };
        },
        async formEditor_setContent(arg) {
          const data = FormEditorOverlayUtils.getData(state);
          data.form[arg.part] = arg.content;
          state.notifyDefinitionChange();
          return toolSuccess('Content updated');
        },
        async formEditor_getInputJsonExample(arg) {
          const data = FormEditorOverlayUtils.getData(state);
          const example = data.form.inputExamples.find(i => i.variableName === arg.variableName);
          if (!example) {
            return toolError('Cannot find the input variable attached to this form');
          }
          if (!example.exampleValue) {
            return toolError(`Example value is not set for \$${arg.variableName}`);
          }
          return {
            content: example.exampleValue
          };
        },
        async formEditor_setInputJsonExample(arg) {
          const data = FormEditorOverlayUtils.getData(state);
          const result = FormEditorOverlayUtils.setInputJsonExample(state, data, arg.variableName, arg.content);
          if (result === 'notInputVariable') {
            return toolError(`The \$${arg.variableName} is not defined as the input variable for this form`);
          }
          if (result === 'undefinedVariable') {
            return toolError('Cannot find variable');
          }
          if (result === 'invalidContent') {
            return toolError('The example value does not match the variable schema');
          }
          state.notifyDefinitionChange();
          return toolSuccess('Example updated');
        },

        // scriptEditor

        async scriptEditor_getFiles() {
          const data = ScriptEditorOverlayUtils.getData(state);
          return {
            filePaths: data.script.contents.map(c => c.path)
          };
        },
        async scriptEditor_getCurrentOpenFile() {
          const data = state.getOverlayState<ScriptEditorOverlayState>();
          return {
            currentFilePath: data.selectedFilePath
          };
        },
        async scriptEditor_getContent(arg) {
          const data = ScriptEditorOverlayUtils.getData(state);
          const content = ScriptEditorOverlayUtils.getFileContent(data, arg.filePath);
          return content === null ? toolError('File not found') : { content };
        },
        async scriptEditor_setContent(arg) {
          const data = ScriptEditorOverlayUtils.getData(state);
          const result = ScriptEditorOverlayUtils.setFileContent(data, arg.filePath, arg.content, arg.mode);
          if (result === 'fileNotFound') {
            return toolError('File not found');
          }
          if (result === 'fileAlreadyExists') {
            return toolError('File already exists');
          }
          state.notifyDefinitionChange();
          return toolSuccess('File content updated');
        },
        async scriptEditor_deleteFile(arg) {
          const data = ScriptEditorOverlayUtils.getData(state);
          return ScriptEditorOverlayUtils.deleteFile(data, arg.filePath) ? toolSuccess('File deleted') : toolError('File not found');
        }
      }),
    [state]
  );

  return (
    <ResourceEditorView
      icon="/"
      name={state.name}
      isNameValid={state.nameError === null}
      isNameReadOnly={!isDesigner || !state.isNew}
      onNameChange={name => state.setName(name, false)}
      detailsId="admin-process-editor-details"
      details={
        isDesigner ? (
          <ResourceSimpleDetailsView
            id="admin-process-editor-details"
            description={state.description}
            descriptionError={state.descriptionError}
            userAccessExpression={state.userAccessExpression}
            userAccessExpressionError={state.userAccessExpressionError}
            onDescriptionChange={description => state.setDescription(description, false)}
            onUserAccessExpressionChange={userAccessExpression => state.setUserAccessExpression(userAccessExpression, false)}
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
      {isDesigner && <Designer />}
      {state.overlay?.type === ProcessEditorOverlayType.SCHEMA_EDITOR && <SchemaEditorOverlay />}
      {state.overlay?.type === ProcessEditorOverlayType.FORM_EDITOR && <FormEditorOverlay />}
      {state.overlay?.type === ProcessEditorOverlayType.SCRIPT_EDITOR && <ScriptEditorOverlay />}
    </ResourceEditorView>
  );
}

function getStepSequence(step: Step, branchName?: string) {
  if (branchName) {
    const b = step as BranchedStep;
    if (typeof b.branches === 'object') {
      const bb = b.branches[branchName];
      if (bb && Array.isArray(bb)) {
        return b.branches[branchName];
      }
    }
  }
  const s = step as SequentialStep;
  if (s.sequence && Array.isArray(s.sequence)) {
    return s.sequence;
  }
  throw new Error('Cannot find sequence in the target step');
}
