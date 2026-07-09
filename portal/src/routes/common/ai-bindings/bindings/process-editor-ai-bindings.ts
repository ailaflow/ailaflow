import z from 'zod/v4';
import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';
import { anyStepSchema, processDefinitionSchema } from '@aila/model';

export const processEditorSetterAiBindings = [
  aiBinding('process_editor_get_details', 'Get the process name, description.').void(),

  aiBinding('process_editor_set_name', 'Set the name of the process').arg(
    z.object({
      name: z.string().describe('The new name of the process')
    })
  ),

  aiBinding('process_editor_set_description', 'Set the description of the process').arg(
    z.object({
      name: z.string().describe('The new description of the process')
    })
  ),

  aiBinding('process_editor_get_available_new_steps', 'Get the list of available new steps that can be added to the process.').void(),

  aiBinding('process_editor_delete_workflow_step', 'Delete a step from the process').arg(
    z.object({
      stepId: z.string().describe('The ID of the step to delete')
    })
  ),

  aiBinding(
    'process_editor_read_workflow_step',
    'Read the JSON of a workflow step. The JSON contains the `properties` field of the step.'
  ).arg(
    z.object({
      stepId: z.string().describe('The ID of the step to read the properties for')
    })
  ),

  aiBinding(
    'process_editor_get_workflow',
    'Read the workflow definition as JSON. It contains the workflow topology: step IDs, names, and execution order. Step `properties` are omitted to reduce payload size; use `process_editor_read_workflow_step_properties` to retrieve them for a specific step.'
  ).void(),

  aiBinding(
    'process_editor_create_workflow_step',
    'Create a new step and returns its JSON. The JSON contains all required fields. The step is not added to the workflow. Use `process_editor_set_workflow` to add this JSON to the proper place in the workflow definition.'
  ).arg(
    z.object({
      type: z.string().describe('The type of the new step'),
      name: z.string().describe('The name of the new step')
    })
  ),

  aiBinding(
    'process_editor_append_workflow_step',
    'Append a new step to the workflow definition before or after a specified step ID. You need to provide the JSON of the new step. If you want to create a new step, use `process_editor_create_workflow_step` first to get the JSON of the new step. If you want to move an existing step, use `process_editor_read_workflow_step` to get the JSON of the existing step, but first delete it from the previous position.'
  ).arg(
    z.object({
      step: z.any().describe('The JSON of the step to append. It must be a valid step JSON.'),
      targetStepId: z.string().describe('The ID of a step that we want to append the new step before or after.'),
      placement: z.enum(['before', 'after']).describe('Whether to append the new step before or after the specified step ID')
    })
  ),

  aiBinding(
    'process_editor_replace_workflow_step',
    'Replace an existing step in the workflow definition with a new step. You need to provide the JSON of the new step. If you want to create a new step, use `process_editor_create_workflow_step` first to get the JSON of the new step. If you want to move an existing step, use `process_editor_read_workflow_step` to get the JSON of the existing step, but first delete it from the previous position.'
  ).arg(
    z.object({
      step: z
        .any()
        .describe(
          'The JSON of the step to replace with. It must be a valid step JSON. We use the ID from this JSON to find the step to replace.'
        )
    })
  )
] as const;

export type ProcessEditorAiBindingsStore = AiBindingsStore<typeof processEditorSetterAiBindings>;

const processEditorRoute = aiRoute(
  'process_editor',
  ['/admin/processes/:processId', '/admin/create-process'],
  'You are not on a process editor page.'
).arg(
  z.object({
    processId: z.string().describe('The ID of the process to edit.')
  })
);

export const processEditorAiBindingsFactory = buildAiBindingStoreFactory<typeof processEditorSetterAiBindings, typeof processEditorRoute>(
  processEditorSetterAiBindings,
  processEditorRoute
);
