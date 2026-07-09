import { ProcessEditorMode, useProcessEditor } from './process-editor-context';
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
import { anyStepSchema, ProcessValidator } from '@aila/model';
import { toolError, toolSuccess } from '../common/ai-bindings/ai-tool-results';
import { toolboxConfiguration } from './designer-configuration';
import { ObjectCloner, Step, Uid } from 'sequential-workflow-designer';

export function ProcessEditorContent() {
  const state = useProcessEditor();
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const isDesigner = state.mode === ProcessEditorMode.DESIGNER;
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
        async process_editor_get_details() {
          return {
            name: state.name,
            description: state.description
          };
        },
        async process_editor_set_name(arg) {
          const error = ProcessValidator.validateName(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setName(arg.name);
          return toolSuccess('Name updated');
        },
        async process_editor_set_description(arg) {
          const error = ProcessValidator.validateDescription(arg.name);
          if (error) {
            return toolError(error);
          }
          state.setDescription(arg.name);
          return toolSuccess('Description updated');
        },
        async process_editor_get_available_new_steps() {
          return toolboxConfiguration.groups
            .flatMap(group => group.steps)
            .map(step => ({
              type: step.type,
              defaultName: step.name
            }));
        },
        process_editor_get_workflow: async () => {
          const definition = ObjectCloner.deepClone(state.definition.value);
          state.walker.forEach(definition, step => {
            const s = step as { properties?: unknown };
            delete s.properties;
          });
          return definition;
        },
        process_editor_read_workflow_step: async arg => {
          const step = state.walker.findById(state.definition.value, arg.stepId);
          if (!step) {
            return toolError('Step ID not found');
          }
          return step;
        },
        process_editor_delete_workflow_step: async arg => {
          const found = state.walker.findParentSequence(state.definition.value, arg.stepId);
          if (!found) {
            return toolError('Step ID not found. The step was not deleted.');
          }
          found.parentSequence.splice(found.index, 1);
          state.notifyDefinitionChange();
          return toolSuccess('Step deleted');
        },
        process_editor_create_workflow_step: async arg => {
          const template = toolboxConfiguration.groups.flatMap(group => group.steps).find(step => step.type === arg.type);
          if (!template) {
            return toolError('Step type not found');
          }
          const newStep = ObjectCloner.deepClone(template) as Step;
          newStep.id = Uid.next();
          newStep.name = arg.name;
          return newStep;
        },
        process_editor_append_workflow_step: async arg => {
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
        process_editor_replace_workflow_step: async arg => {
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
      {state.mode === ProcessEditorMode.SCHEMA_EDITOR && <SchemaSubEditor />}
      {state.mode === ProcessEditorMode.FORM_EDITOR && <FormSubEditor />}
      {state.mode === ProcessEditorMode.SCRIPT_EDITOR && <ScriptSubEditor />}
    </ResourceEditorView>
  );
}
