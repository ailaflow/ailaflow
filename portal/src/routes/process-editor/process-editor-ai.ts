import { toolError, toolSuccess } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import { ProcessEditorOverlayType, ProcessEditorState } from './process-editor-context';
import { createEmptyFormDefinition, toolboxConfiguration } from './designer-configuration';
import { ObjectCloner, Sequence, Step, Uid } from 'sequential-workflow-designer';
import {
  AgentStep,
  BranchNameValidator,
  BranchStep,
  NotificationStep,
  ProcessRootVariableValidator,
  ResourceNameNormalizer,
  ReturnStep,
  ScriptStep,
  TaskStep,
  TaskStepValidator,
  UserAccessExpressionParser,
  VariableDefinition
} from '@ailaflow/shared';
import { DesignerUtils } from './designer-utils';
import { DefinitionPath } from '../../core/definition-path';
import { FormEditorOverlayUtils } from './overlays/form-editor-overlay-utils';
import { ScriptEditorOverlayUtils } from './overlays/script-editor-overlay-utils';
import { ScriptEditorOverlayState } from './overlays/script-editor-overlay';

export function useProcessEditorAi(state: ProcessEditorState, save: () => Promise<void>) {
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
            return toolError('The name of a saved process cannot be changed');
          }
          const name = ResourceNameNormalizer.removePrefix(arg.name, '/');
          state.setName(name, true);
          return toolSuccess('Process name was updated');
        },
        async setProcessDescription(arg) {
          state.setDescription(arg.description, true);
          return toolSuccess('Process description was updated');
        },
        async getProcessUserAccessExpression() {
          return {
            userAccessExpression: state.userAccessExpression
          };
        },
        async setProcessUserAccessExpression(arg) {
          state.setUserAccessExpression(arg.userAccessExpression, true);
          return toolSuccess('Process user access expression was updated');
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
          return toolSuccess('All changes were saved');
        },

        // workflow

        async getAvailableNewStepTypes() {
          return toolboxConfiguration.groups
            .flatMap(group => group.steps)
            .map(step => ({
              type: step.type,
              defaultName: step.name
            }));
        },
        async getSelectedStep() {
          if (state.selectedStepId) {
            const step = state.getStep(state.selectedStepId);
            return {
              isSelected: true,
              stepId: step.id,
              stepName: step.name
            };
          }
          return {
            isSelected: false
          };
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
          return toolSuccess('Workflow step was deleted');
        },
        async renameWorkflowStep(arg) {
          const step = state.walker.findById(state.definition.value, arg.stepId);
          if (!step) {
            return toolError('No workflow step was found with the provided ID; no step was renamed');
          }
          const nameError = state.stepValidator.validateName(arg.newName);
          if (nameError) {
            return toolError(nameError);
          }
          step.name = arg.newName;
          state.notifyDefinitionChange();
          return toolSuccess('Workflow step was renamed');
        },
        async createWorkflowStepDraft(arg) {
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
          const stepOrError = DesignerUtils.tryParseAndValidateStep(arg.step, state.stepValidator, state.definition.value);
          if (typeof stepOrError === 'string') {
            return toolError(`${stepOrError}; no step was inserted`);
          }
          const found = state.walker.findParentSequence(state.definition.value, arg.targetStepId);
          if (!found) {
            return toolError('No target workflow step was found with the provided ID; no step was inserted');
          }
          found.parentSequence.splice(arg.placement === 'before' ? found.index : found.index + 1, 0, stepOrError);

          state.notifyDefinitionChange();
          return toolSuccess('Workflow step was inserted');
        },
        async replaceWorkflowStep(arg) {
          const stepOrError = DesignerUtils.tryParseAndValidateStep(arg.step, state.stepValidator, state.definition.value);
          if (typeof stepOrError === 'string') {
            return toolError(`${stepOrError}; no step was replaced`);
          }
          const found = state.walker.findParentSequence(state.definition.value, arg.step.id);
          if (!found) {
            return toolError('No workflow step was found with the replacement step ID; no step was replaced');
          }
          found.parentSequence[found.index] = stepOrError;

          state.notifyDefinitionChange();
          return toolSuccess('Workflow step was replaced');
        },
        async appendWorkflowStep(arg) {
          const stepOrError = DesignerUtils.tryParseAndValidateStep(arg.step, state.stepValidator, state.definition.value);
          if (typeof stepOrError === 'string') {
            return toolError(`${stepOrError}; no step was added`);
          }
          let sequence: Sequence;
          if (arg.targetStepId) {
            const found = state.walker.findParentSequence(state.definition.value, arg.targetStepId);
            if (!found) {
              return toolError(`Cannot find the target step with ID "${arg.targetStepId}"; no step was added`);
            }
            sequence = DesignerUtils.getStepSequence(found.step, arg.branchName);
          } else {
            sequence = state.definition.value.sequence;
          }
          sequence.push(stepOrError);
          state.notifyDefinitionChange();
          return toolSuccess('Workflow step was added');
        },

        // root

        async getRootVariables(arg) {
          let variables = state.definition.value.properties.variables;
          const filter = arg.filter;
          if (filter) {
            variables = variables.filter(v => v.name.includes(filter));
          }
          return variables.map(v => ({
            name: v.name,
            description: v.description,
            schema: v.schema
          }));
        },
        async readRootProperties() {
          const props = ObjectCloner.deepClone(state.definition.value.properties) as Record<string, unknown>;
          delete props.version;
          return props;
        },
        async isRootStartFormEnabled() {
          return {
            isEnabled: Boolean(state.definition.value.properties.startForm)
          };
        },
        async setRootStartFormEnabled(arg) {
          state.definition.value.properties.startForm = arg.isEnabled ? createEmptyFormDefinition() : undefined;
          state.notifyDefinitionChange();
          return toolSuccess(`Process start form was ${arg.isEnabled ? 'enabled' : 'disabled'}`);
        },
        async openRootStartFormEditorOverlay() {
          if (!state.definition.value.properties.startForm) {
            return toolError('Enable the process start form before opening its editor overlay');
          }
          state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, DefinitionPath.createRootPath('properties.startForm'));
          return toolSuccess('Process start form editor overlay was opened');
        },
        async getRootStartVariables() {
          return {
            variableNames: state.definition.value.properties.startVariableNames
          };
        },
        async setRootStartVariables(arg) {
          for (const rawName of arg.variableNames) {
            const name = ResourceNameNormalizer.removePrefix(rawName, '$');
            const variable = state.definition.value.properties.variables.find(v => v.name === name);
            if (!variable) {
              return toolError(`Cannot find variable "\$${name}"; process start variable names were not updated`);
            }
          }
          state.definition.value.properties.startVariableNames = arg.variableNames;
          state.notifyDefinitionChange();
          return toolSuccess('Process start variable names were updated');
        },
        async modifyRootVariable(arg) {
          const variables = state.definition.value.properties.variables;
          switch (arg.action) {
            case 'set': {
              const name = ResourceNameNormalizer.removePrefix(arg.name, '$');
              const nameError = ProcessRootVariableValidator.validateName(name);
              if (nameError) {
                return toolError(`Invalid name: ${nameError}; the variable was not set`);
              }
              const schemaError = ProcessRootVariableValidator.validateSchema(arg.schema);
              if (schemaError) {
                return toolError(`Invalid schema: ${schemaError}; the variable was not set`);
              }
              const variable: VariableDefinition = {
                name,
                description: arg.description,
                schema: arg.schema
              };
              const index = variables.findIndex(v => v.name === name);
              if (index < 0) {
                variables.push(variable);
              } else {
                variables[index] = variable;
              }
              state.notifyDefinitionChange();
              return toolSuccess('Variable was set');
            }
            case 'delete': {
              const name = ResourceNameNormalizer.removePrefix(arg.name, '$');
              const index = variables.findIndex(v => v.name === name);
              if (index < 0) {
                return toolError(`Cannot find variable "\$${name}"`);
              }
              variables.splice(index, 1);
              state.notifyDefinitionChange();
              return toolSuccess('Variable was deleted');
            }
          }
        },

        // steps

        async scriptStep_openScriptEditorOverlay(arg) {
          const step = state.getStep<ScriptStep>(arg.stepId, 'script');
          const path = DefinitionPath.createStepPath(step.id, 'properties.script');
          state.openOverlay(ProcessEditorOverlayType.SCRIPT_EDITOR, path);
          return toolSuccess('Script editor overlay was opened');
        },
        async scriptStep_setSandboxName(arg) {
          if (!state.sandboxes.find(s => s.name === arg.sandboxName)) {
            return toolError(`Sandbox name "${arg.sandboxName}" is not available`);
          }
          const step = state.getStep<ScriptStep>(arg.stepId, 'script');
          step.properties.script.sandboxName = arg.sandboxName;
          state.notifyDefinitionChange();
          return toolSuccess('Sandbox name was updated');
        },

        async agentStep_setPrompt(arg) {
          const step = state.getStep<AgentStep>(arg.stepId, 'agent');
          switch (arg.action) {
            case 'string': {
              step.properties.prompt = { type: 'string', value: arg.prompt };
              break;
            }
            case 'variable': {
              const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
              if (error) {
                return toolError(error);
              }
              step.properties.prompt = { type: 'variable', name: arg.variableName };
              break;
            }
          }
          state.notifyDefinitionChange();
          return toolSuccess('Prompt was updated');
        },
        async agentStep_setAllowedProcessNames(arg) {
          const step = state.getStep<AgentStep>(arg.stepId, 'agent');
          step.properties.allowedProcessNames = arg.processNames;
          state.notifyDefinitionChange();
          return toolSuccess('Allowed processes were updated');
        },
        async agentStep_setAllowedVariables(arg) {
          const step = state.getStep<AgentStep>(arg.stepId, 'agent');
          const error = state.variableValidator.validateVariablesReference(arg.variableNames, state.definition.value);
          if (error) {
            return toolError(error);
          }
          step.properties.allowedVariableNames = arg.variableNames;
          state.notifyDefinitionChange();
          return toolSuccess('Allowed variable names were updated');
        },
        async agentStep_setSandboxName(arg) {
          const step = state.getStep<AgentStep>(arg.stepId, 'agent');
          if (!state.sandboxes.find(s => s.name === arg.sandboxName)) {
            return toolError(`Sandbox name "${arg.sandboxName}" is not available`);
          }
          step.properties.sandboxName = arg.sandboxName;
          state.notifyDefinitionChange();
          return toolSuccess('Sandbox name was updated');
        },
        async agentStep_isTerminalAllowed(arg) {
          const step = state.getStep<AgentStep>(arg.stepId, 'agent');
          return {
            isTerminalAllowed: step.properties.isTerminalAllowed
          };
        },
        async agentStep_setTerminalAllowed(arg) {
          const step = state.getStep<AgentStep>(arg.stepId, 'agent');
          step.properties.isTerminalAllowed = arg.isTerminalAllowed;
          state.notifyDefinitionChange();
          return toolSuccess('Terminal access was updated');
        },

        async taskStep_openFormEditorOverlay(arg) {
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          const path = DefinitionPath.createStepPath(step.id, 'properties.form');
          state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, path);
          return toolSuccess('Task step form editor overlay was opened');
        },
        async taskStep_setTitle(arg) {
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          switch (arg.action) {
            case 'string': {
              step.properties.title = { type: 'string', value: arg.title };
              break;
            }
            case 'variable': {
              const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
              if (error) {
                return toolError(error);
              }
              step.properties.title = { type: 'variable', name: arg.variableName };
              break;
            }
          }
          state.notifyDefinitionChange();
          return toolSuccess('Task title was updated');
        },
        async taskStep_setInputVariables(arg) {
          const error = state.variableValidator.validateVariablesReference(arg.variableNames, state.definition.value);
          if (error) {
            return toolError(error);
          }
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          step.properties.inputVariableNames = arg.variableNames;
          state.notifyDefinitionChange();
          return toolSuccess('Input variable names were updated');
        },
        async taskStep_setOutputVariables(arg) {
          const error = TaskStepValidator.validateOutputVariables(state.variableValidator, state.definition.value, arg.variableNames);
          if (error) {
            return toolError(error);
          }

          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          step.properties.outputVariableNames = arg.variableNames;
          state.notifyDefinitionChange();
          return toolSuccess('Output variable names were updated');
        },
        async taskStep_setUserExpression(arg) {
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          switch (arg.action) {
            case 'string': {
              const error = UserAccessExpressionParser.validate(arg.userExpression);
              if (error) {
                return toolError(`${error}; the user expression was not updated`);
              }
              step.properties.userExpression = { type: 'string', value: arg.userExpression };
              break;
            }
            case 'variable': {
              const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
              if (error) {
                return toolError(error);
              }
              step.properties.userExpression = { type: 'variable', name: arg.variableName };
              break;
            }
          }
          state.notifyDefinitionChange();
          return toolSuccess('User expression was updated');
        },
        async taskStep_setMetadataVariableName(arg) {
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          const variableName = arg.variableName === '' ? undefined : (arg.variableName ?? undefined);
          if (variableName !== undefined) {
            const error = state.variableValidator.validateVariableType(variableName, 'object', state.definition.value);
            if (error) {
              return toolError(error);
            }
          }
          step.properties.metadataVariableName = variableName;
          state.notifyDefinitionChange();
          return toolSuccess('Metadata variable name was updated');
        },
        async taskStep_setDeadline(arg) {
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          switch (arg.action) {
            case 'preset': {
              step.properties.deadline = { type: 'string', value: arg.preset };
              break;
            }
            case 'variable': {
              const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
              if (error) {
                return toolError(error);
              }
              step.properties.deadline = { type: 'variable', name: arg.variableName };
              break;
            }
            case 'unset': {
              step.properties.deadline = undefined;
              break;
            }
          }
          state.notifyDefinitionChange();
          return toolSuccess('Deadline was updated');
        },
        async taskStep_setFinalizationPolicy(arg) {
          const step = state.getStep<TaskStep>(arg.stepId, 'task');
          step.properties.finalizationPolicy = arg.finalizationPolicy;
          state.notifyDefinitionChange();
          return toolSuccess('Finalization policy was updated');
        },

        async notificationStep_setUserExpression(arg) {
          const step = state.getStep<NotificationStep>(arg.stepId, 'notification');
          switch (arg.action) {
            case 'string': {
              const error = UserAccessExpressionParser.validate(arg.userExpression);
              if (error) {
                return toolError(`${error}; the user expression was not updated`);
              }
              step.properties.userExpression = { type: 'string', value: arg.userExpression };
              break;
            }
            case 'variable': {
              const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
              if (error) {
                return toolError(error);
              }
              step.properties.userExpression = { type: 'variable', name: arg.variableName };
              break;
            }
          }
          state.notifyDefinitionChange();
          return toolSuccess('User expression was updated');
        },
        async notificationStep_setNotification(arg) {
          const step = state.getStep<NotificationStep>(arg.stepId, 'notification');
          switch (arg.action) {
            case 'string': {
              step.properties.notification = { type: 'string', value: arg.notification };
              break;
            }
            case 'variable': {
              const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
              if (error) {
                return toolError(error);
              }
              step.properties.notification = { type: 'variable', name: arg.variableName };
              break;
            }
          }
          state.notifyDefinitionChange();
          return toolSuccess('Notification was updated');
        },

        async branchStep_setSelectorVariableName(arg) {
          const error = state.variableValidator.validateVariableType(arg.variableName, 'string', state.definition.value);
          if (error) {
            return toolError(error);
          }
          const step = state.getStep<BranchStep>(arg.stepId, 'branch');
          step.properties.branchSelectorVariableName = arg.variableName;
          state.notifyDefinitionChange();
          return toolSuccess('Branch selector variable was updated');
        },
        async branchStep_modifyBranches(arg) {
          const step = state.getStep<BranchStep>(arg.stepId, 'branch');
          switch (arg.action) {
            case 'add':
              const nameError = BranchNameValidator.validateName(arg.name);
              if (nameError) {
                return toolError(`${nameError} The branch was not added`);
              }
              if (step.branches[arg.name]) {
                return toolError(`Branch "${arg.name}" already exists`);
              }
              step.branches[arg.name] = [];
              state.notifyDefinitionChange();
              return toolSuccess('Branch was added');
            case 'delete':
              if (!step.branches[arg.name]) {
                return toolError(`Branch "${arg.name}" does not exist`);
              }
              if (Object.keys(step.branches).length <= 1) {
                return toolError('The last branch cannot be deleted');
              }
              delete step.branches[arg.name];
              state.notifyDefinitionChange();
              return toolSuccess('Branch was deleted');
          }
        },

        async returnStep_isOutputFormEnabled(arg) {
          const step = state.getStep<ReturnStep>(arg.stepId, 'return');
          return {
            isEnabled: Boolean(step.properties.outputForm)
          };
        },
        async returnStep_setOutputFormEnabled(arg) {
          const step = state.getStep<ReturnStep>(arg.stepId, 'return');
          step.properties.outputForm = arg.isEnabled ? createEmptyFormDefinition() : undefined;
          state.notifyDefinitionChange();
          return toolSuccess(`Return step output form was ${arg.isEnabled ? 'enabled' : 'disabled'}`);
        },
        async returnStep_openOutputFormEditorOverlay(arg) {
          const step = state.getStep<ReturnStep>(arg.stepId, 'return');
          if (!step.properties.outputForm) {
            return toolError('Enable the return step output form before opening its editor overlay');
          }
          const path = DefinitionPath.createStepPath(step.id, 'properties.outputForm');
          state.openOverlay(ProcessEditorOverlayType.FORM_EDITOR, path);
          return toolSuccess('Form editor overlay was opened');
        },
        async returnStep_setOutputVariables(arg) {
          const error = state.variableValidator.validateVariablesReference(arg.variableNames, state.definition.value);
          if (error) {
            return toolError(error);
          }
          const step = state.getStep<ReturnStep>(arg.stepId, 'return');
          step.properties.outputVariableNames = arg.variableNames;
          state.notifyDefinitionChange();
          return toolSuccess('Output variable names were updated');
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
          return toolSuccess('Overlay was closed');
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
          return toolSuccess('Content was updated');
        },
        async formEditor_getInputJsonExample(arg) {
          const variableName = ResourceNameNormalizer.removePrefix(arg.variableName, '$');
          const data = FormEditorOverlayUtils.getData(state);
          const example = data.form.inputExamples.find(i => i.variableName === variableName);
          if (!example) {
            return toolError('Cannot find the input variable attached to this form');
          }
          if (!example.exampleValue) {
            return toolError(`No example value is set for variable \$${variableName}`);
          }
          return {
            content: example.exampleValue
          };
        },
        async formEditor_setInputJsonExample(arg) {
          const variableName = ResourceNameNormalizer.removePrefix(arg.variableName, '$');
          const data = FormEditorOverlayUtils.getData(state);
          const result = FormEditorOverlayUtils.setInputJsonExample(state, data, variableName, arg.content);
          if (result === 'notInputVariable') {
            return toolError(`Variable \$${variableName} is not defined as an input variable for this form`);
          }
          if (result === 'undefinedVariable') {
            return toolError('Cannot find the variable');
          }
          if (result === 'invalidContent') {
            return toolError('The example value does not match the variable schema');
          }
          state.notifyDefinitionChange();
          return toolSuccess('Example was updated');
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
          const content = ScriptEditorOverlayUtils.tryGetFileContent(data, arg.filePath);
          return content === null ? toolError('File not found') : { content };
        },
        async scriptEditor_modifyFile(arg) {
          const data = ScriptEditorOverlayUtils.getData(state);
          switch (arg.action) {
            case 'create':
            case 'edit': {
              const result = ScriptEditorOverlayUtils.setFileContent(data, arg.filePath, arg.content, arg.action);
              if (result === 'pathError') {
                return toolError(
                  'Invalid file path. Use a relative path like "src/main.js"; names and extensions may contain only ASCII letters, numbers, "_", and "-"'
                );
              }
              if (result === 'fileNotFound') {
                return toolError('File not found');
              }
              if (result === 'fileAlreadyExists') {
                return toolError('File already exists');
              }
              state.notifyDefinitionChange();
              return toolSuccess('File content was updated');
            }
            case 'delete': {
              if (!ScriptEditorOverlayUtils.deleteFile(data, arg.filePath)) {
                return toolError('File not found');
              }
              state.notifyDefinitionChange();
              return toolSuccess('File was deleted');
            }
          }
        }
      }),
    [state, save]
  );
}
