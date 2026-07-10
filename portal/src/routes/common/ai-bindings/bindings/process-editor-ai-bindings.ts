import z from 'zod/v4';
import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';

export const processEditorSetterAiBindings = [
  aiBinding('processEditor_getDetails', 'Get the process name and description.').void(),

  aiBinding('processEditor_setName', 'Set the name of the process').arg(
    z.object({
      name: z.string().describe('The new name of the process')
    })
  ),

  aiBinding('processEditor_setDescription', 'Set the description of the process').arg(
    z.object({
      name: z.string().describe('The new description of the process')
    })
  ),

  aiBinding('processEditor_getAvailableNewSteps', 'Get the list of available new steps that can be added to the workflow.').void(),

  aiBinding('processEditor_deleteWorkflowStep', 'Delete a step from the process').arg(
    z.object({
      stepId: z.string().describe('The ID of the step to delete')
    })
  ),

  aiBinding(
    'processEditor_readWorkflowStep',
    'Read the JSON of a workflow step. The JSON contains all fields including the `properties` field of the step.'
  ).arg(
    z.object({
      stepId: z.string().describe('The ID of the step to read the properties for')
    })
  ),

  aiBinding(
    'processEditor_getWorkflow',
    'Read the workflow definition as JSON. It contains the workflow topology: step IDs, names, and execution order. The `properties` fields are omitted to reduce payload size; use `processEditor_readWorkflowStep` to retrieve the full JSON of a step.'
  ).void(),

  aiBinding(
    'processEditor_createWorkflowStep',
    'Create a new step and returns its JSON. The JSON contains all required fields. The step is not added to the workflow. Use `processEditor_appendWorkflowStep` to add this JSON to the proper place in the workflow definition.'
  ).arg(
    z.object({
      type: z.string().describe('The type of the new step'),
      name: z.string().describe('The name of the new step')
    })
  ),

  aiBinding(
    'processEditor_appendWorkflowStep',
    'Append a new step to the workflow definition before or after a specified step ID. You need to provide the JSON of the new step. If you want to create a new step, use `processEditor_createWorkflowStep` first to get the JSON of the new step. If you want to move an existing step, use `processEditor_readWorkflowStep` to get the JSON of the existing step, but first delete it from the previous position.'
  ).arg(
    z.object({
      step: z.any().describe('The JSON of the step to append. It must be a valid step JSON.'),
      targetStepId: z.string().describe('The ID of a step that we want to append the new step before or after.'),
      placement: z.enum(['before', 'after']).describe('Whether to append the new step before or after the specified step ID')
    })
  ),

  aiBinding(
    'processEditor_replaceWorkflowStep',
    'Replace an existing step in the workflow definition with a new step. You need to provide the JSON of the new step. If you want to create a new step, use `processEditor_createWorkflowStep` first to get the JSON of the new step. If you want to move an existing step, use `processEditor_readWorkflowStep` to get the JSON of the existing step, but first delete it from the previous position.'
  ).arg(
    z.object({
      step: z
        .any()
        .describe(
          'The JSON of the step to replace with. It must be a valid step JSON. We use the ID from this JSON to find the step to replace.'
        )
    })
  ),

  aiBinding('processEditor_getRootVariables', 'Get the list of variables defined in the process.').void(),

  aiBinding('processEditor_isRootStartFormEnabled', 'Check if the start form of the process is enabled.').void(),

  aiBinding('processEditor_switchRootStartForm', 'Enable or disable the start form of the process.').arg(
    z.object({
      isEnabled: z.boolean()
    })
  ),

  aiBinding(
    'processEditor_openDesigner',
    'Open the process designer. This changes the child route to `designer`. The designer is the default child route of the process editor.'
  ).void(),

  aiBinding(
    'processEditor_openRootStartFormEditor',
    'Open the start form editor for the process. This changes the child route to `form-editor`.'
  ).void(),

  aiBinding('processEditor_getChildRoute', 'Return the child route of the process editor.').void(),

  aiBinding(
    'processEditor_formEditor_getAvailableVariables',
    'Get the list of available input and output variables for the currently edited form. Variables can be used in the form logic.'
  ).void(),
  aiBinding('processEditor_formEditor_get', 'Get the HTML, CSS, or JS of the currently edited form in the form editor.').arg(
    z.object({
      type: z.enum(['html', 'css', 'js']).describe('The type of the form content to get.')
    })
  ),
  aiBinding('processEditor_formEditor_set', 'Set the HTML, CSS, or JS of the currently edited form in the form editor.').arg(
    z.object({
      type: z.enum(['html', 'css', 'js']).describe('The type of the form content to get.'),
      value: z.string().describe('The new value of the form content to set.')
    })
  )
] as const;

export type ProcessEditorAiBindingsStore = AiBindingsStore<typeof processEditorSetterAiBindings>;

const processEditorRoute = aiRoute(
  'processEditor',
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
