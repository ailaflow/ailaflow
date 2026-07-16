import { ProcessEditorOverlayType, useProcessEditor } from './process-editor-context';
import { SchemaChildEditor } from './child-editors/schema-child-editor';
import { DesignerChildEditor } from './child-editors/designer-child-editor';
import { useApiClient } from '../../auth/auth-context';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useNavigate } from 'react-router-dom';
import { FormChildEditor } from './child-editors/form-child-editor';
import { ScriptChildEditor, ScriptChildEditorState } from './child-editors/script-child-editor';
import { ResourceSimpleDetailsView } from '../../views/resource-editor/resource-simple-details-view';
import { fnv1a } from '../../core/fnv1a';
import { anyStepSchema, ProcessValidator } from '@aila/model';
import { toolError, toolSuccess } from '@aibindkit/react';
import { createEmptyFormDefinition, toolboxConfiguration } from './designer-configuration';
import { ObjectCloner, Step, Uid } from 'sequential-workflow-designer';
import { DefinitionPath } from '../../core/definition-path';
import { useAiStore, useUnsavedChangesController } from '../common/admin-portal';
import { FormChildEditorUtils } from './child-editors/form-child-editor-utils';
import { ScriptChildEditorUtils } from './child-editors/script-child-editor-utils';
import z from 'zod/v4';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = !state.overlay;
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

  useUnsavedChangesController(state.isDirty);

  useAiStore(
    'processEditor',
    store =>
      store.bind({
        async getDetails() {
          return {
            name: state.name,
            description: state.description
          };
        },
        async setName(arg) {
          const error = ProcessValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setName(arg.name);
          return toolSuccess('Process name updated');
        },
        async setDescription(arg) {
          const error = ProcessValidator.validateDescription(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setDescription(arg.name);
          return toolSuccess('Process description updated');
        },
        async getAvailableNewSteps() {
          return toolboxConfiguration.groups
            .flatMap(group => group.steps)
            .map(step => ({
              type: step.type,
              defaultName: step.name
            }));
        },
        async getWorkflow() {
          const definition = ObjectCloner.deepClone(state.definition.value);
          state.walker.forEach(definition, step => {
            const s = step as { properties?: unknown };
            delete s.properties;
          });
          return definition;
        },
        async readWorkflowStep(arg) {
          const step = state.walker.findById(state.definition.value, arg.stepId);
          if (!step) {
            return toolError('No workflow step was found with the provided ID');
          }
          return step;
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
        async appendWorkflowStep(arg) {
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
        async switchRootStartForm(arg) {
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
          const v = FormChildEditorUtils.getData(state);
          return {
            inputVariableNames: v.inputVariableNames,
            outputVariableNames: v.outputVariableNames
          };
        },
        async formEditor_getContent(arg) {
          const v = FormChildEditorUtils.getData(state);
          return {
            content: v.form[arg.part]
          };
        },
        async formEditor_setContent(arg) {
          const v = FormChildEditorUtils.getData(state);
          v.form[arg.part] = arg.content;
          state.notifyDefinitionChange();
          return toolSuccess('Form content updated');
        },
        async formEditor_getInputJsonExample(arg) {
          const v = FormChildEditorUtils.getData(state);
          const example = v.form.inputExamples.find(i => i.variableName === arg.variableName);
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
          const v = FormChildEditorUtils.getData(state);
          if (!v.inputVariableNames.includes(arg.variableName)) {
            return toolError(`The \$${arg.variableName} is defined as the input variable for this form`);
          }
          const variable = state.definition.value.properties.variables.find(i => i.name === arg.variableName);
          if (!variable) {
            return toolError('Cannot find variable');
          }
          const result = z.fromJSONSchema(variable.schema).safeParse(arg.content);
          if (result.error) {
            return toolError(`The example value does not match the variable schema: ${result.error}`);
          }
          const exampleValue = JSON.stringify(arg.content);
          let example = v.form.inputExamples.find(i => i.variableName === arg.variableName);
          if (!example) {
            example = { variableName: arg.variableName, exampleValue };
            v.form.inputExamples.push(example);
          } else {
            example.exampleValue = exampleValue;
          }
          state.notifyDefinitionChange();
          return toolSuccess('Example updated');
        },

        // scriptEditor

        async scriptEditor_getFiles() {
          const d = ScriptChildEditorUtils.getData(state);
          return {
            filePaths: d.form.contents.map(c => c.path)
          };
        },
        async scriptEditor_getCurrentOpenFile() {
          const s = state.getOverlayState<ScriptChildEditorState>();
          return {
            selectedFilePath: s.selectedFilePath
          };
        },
        async scriptEditor_getContent(arg) {
          const d = ScriptChildEditorUtils.getData(state);
          const content = ScriptChildEditorUtils.getFileContent(d, arg.filePath);
          return content === null ? toolError('File not found') : { content };
        },
        async scriptEditor_setContent(arg) {
          const d = ScriptChildEditorUtils.getData(state);
          const result = ScriptChildEditorUtils.setFileContent(d, arg.filePath, arg.content, arg.mode);
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
          const d = ScriptChildEditorUtils.getData(state);
          return ScriptChildEditorUtils.deleteFile(d, arg.filePath) ? toolSuccess('File deleted') : toolError('File not found');
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
      {isDesigner && <DesignerChildEditor />}
      {state.overlay?.type === ProcessEditorOverlayType.SCHEMA_EDITOR && <SchemaChildEditor />}
      {state.overlay?.type === ProcessEditorOverlayType.FORM_EDITOR && <FormChildEditor />}
      {state.overlay?.type === ProcessEditorOverlayType.SCRIPT_EDITOR && <ScriptChildEditor />}
    </ResourceEditorView>
  );
}
