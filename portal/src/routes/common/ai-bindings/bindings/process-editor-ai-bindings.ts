import z from 'zod/v4';
import { aiRoute, storeFactoryFromRoute, tool } from '../ai-bindings';

const processEditorRoute = aiRoute('processEditor')
  .unavailable('You are not on a process editor page.')
  .paths(['/admin/processes/:processId', '/admin/create-process'])
  .params(
    z.object({
      processId: z.string().describe('The ID of the process to edit.')
    })
  )
  .tools({
    getDetails: tool('Get the process name and description.'),

    setName: tool('Set the name of the process').input(
      z.object({
        name: z.string().describe('The new name of the process')
      })
    ),

    setDescription: tool('Set the description of the process').input(
      z.object({
        name: z.string().describe('The new description of the process')
      })
    ),

    getAvailableNewSteps: tool('Get the list of available new steps that can be added to the workflow.'),

    deleteWorkflowStep: tool('Delete a step from the process').input(
      z.object({
        stepId: z.string().describe('The ID of the step to delete')
      })
    ),

    readWorkflowStep: tool(
      'Read the JSON of a workflow step. The JSON contains all fields including the `properties` field of the step.'
    ).input(
      z.object({
        stepId: z.string().describe('The ID of the step to read the properties for')
      })
    ),

    getWorkflow: tool(
      'Read the workflow definition as JSON. It contains the workflow topology: step IDs, names, and execution order. The `properties` fields are omitted to reduce payload size; use `readWorkflowStep` to retrieve the full JSON of a step.'
    ),

    createWorkflowStep: tool(
      'Create a new step and returns its JSON. The JSON contains all required fields. The step is not added to the workflow. Use `appendWorkflowStep` to add this JSON to the proper place in the workflow definition.'
    ).input(
      z.object({
        type: z.string().describe('The type of the new step'),
        name: z.string().describe('The name of the new step')
      })
    ),

    appendWorkflowStep: tool(
      'Append a new step to the workflow definition before or after a specified step ID. You need to provide the JSON of the new step. If you want to create a new step, use `createWorkflowStep` first to get the JSON of the new step. If you want to move an existing step, use `readWorkflowStep` to get the JSON of the existing step, but first delete it from the previous position.'
    ).input(
      z.object({
        step: z.any().describe('The JSON of the step to append. It must be a valid step JSON.'),
        targetStepId: z.string().describe('The ID of a step that we want to append the new step before or after.'),
        placement: z.enum(['before', 'after']).describe('Whether to append the new step before or after the specified step ID')
      })
    ),

    replaceWorkflowStep: tool(
      'Replace an existing step in the workflow definition with a new step. You need to provide the JSON of the new step. If you want to create a new step, use `createWorkflowStep` first to get the JSON of the new step. If you want to move an existing step, use `readWorkflowStep` to get the JSON of the existing step, but first delete it from the previous position.'
    ).input(
      z.object({
        step: z
          .any()
          .describe(
            'The JSON of the step to replace with. It must be a valid step JSON. We use the ID from this JSON to find the step to replace.'
          )
      })
    ),

    getRootVariables: tool('Get the list of variables defined in the process.'),

    isRootStartFormEnabled: tool('Check if the start form of the process is enabled.'),

    switchRootStartForm: tool('Enable or disable the start form of the process.').input(
      z.object({
        isEnabled: z.boolean()
      })
    ),

    openDesigner: tool(
      'Open the process designer. This changes the child route to `designer`. The designer is the default child route of the process editor.'
    ),

    openRootStartFormEditor: tool('Open the start form editor for the process. This changes the child route to `form-editor`.'),

    getChildRoute: tool('Return the child route of the process editor.'),

    formEditor_getAvailableVariables: tool(
      'Get the list of available input and output variables for the currently edited form. Variables can be used in the form logic.'
    ),

    formEditor_get: tool('Get the HTML, CSS, or JS of the currently edited form in the form editor.').input(
      z.object({
        type: z.enum(['html', 'css', 'js']).describe('The type of the form content to get.')
      })
    ),

    formEditor_set: tool('Set the HTML, CSS, or JS of the currently edited form in the form editor.').input(
      z.object({
        type: z.enum(['html', 'css', 'js']).describe('The type of the form content to get.'),
        value: z.string().describe('The new value of the form content to set.')
      })
    )
  });

export const processEditorAiBindingsFactory = storeFactoryFromRoute(processEditorRoute);

export type ProcessEditorAiBindingsStore = ReturnType<typeof processEditorAiBindingsFactory>;
