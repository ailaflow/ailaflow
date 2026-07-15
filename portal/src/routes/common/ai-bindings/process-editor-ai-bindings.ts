import z from 'zod/v4';
import { route, storeFactory, tool } from '@aibindkit/react';

// Conventions:
// - don't add a dot `.` at the end of the description to reduce amount of tokens.
// - keep the descriptions as short as possible to reduce the amount of tokens.

const processEditorRoute = route('processEditor')
  .unavailable('You are not on a process editor page.')
  .paths(['/admin/processes/:processId', '/admin/create-process'])
  .params(
    z.object({
      processId: z.string().describe('ID of the process to edit')
    })
  )
  .tools({
    getDetails: tool('Get the process name and description'),

    setName: tool('Rename the process').input(
      z.object({
        name: z.string().describe('The new name of the process')
      })
    ),

    setDescription: tool('Update the process description').input(
      z.object({
        name: z.string().describe('The new process description')
      })
    ),

    getAvailableNewSteps: tool('List step types that can be added to the workflow'),

    deleteWorkflowStep: tool('Delete a step from the workflow').input(
      z.object({
        stepId: z.string().describe('The ID of the step to delete')
      })
    ),

    readWorkflowStep: tool('Read the full JSON for one workflow step, including its `properties`').input(
      z.object({
        stepId: z.string().describe('The ID of the workflow step to read')
      })
    ),

    getWorkflow: tool(
      'Read workflow topology as JSON: step IDs, names, and order; omits `properties`, use `readWorkflowStep` for full step JSON'
    ),

    createWorkflowStep: tool(
      'Create JSON for a new step without adding it to the workflow; then call `appendWorkflowStep` to insert it'
    ).input(
      z.object({
        type: z.string().describe('The type of the new step'),
        name: z.string().describe('The name of the new step')
      })
    ),

    appendWorkflowStep: tool(
      'Insert step JSON before or after a target step; create new JSON with `createWorkflowStep`, or read then delete an existing step before moving it'
    ).input(
      z.object({
        step: z.any().describe('Valid JSON for the step to insert'),
        targetStepId: z.string().describe('ID of the step to insert before or after'),
        placement: z.enum(['before', 'after']).describe('Whether to insert the step before or after the target step')
      })
    ),

    replaceWorkflowStep: tool('Replace an existing workflow step with step JSON; the replacement target is selected by `step.id`').input(
      z.object({
        step: z.any().describe('Valid replacement step JSON; its `id` identifies the workflow step to replace')
      })
    ),

    hasUnsavedChanges: tool('Checks if there is any unsaved change'),
    save: tool('Save all changes'),

    // root

    getRootVariables: tool('List process variables with their names and JSON schemas'),
    isRootStartFormEnabled: tool('Check whether the process start form is enabled'),
    switchRootStartForm: tool('Enable or disable the process start form').input(
      z.object({
        isEnabled: z.boolean().describe('Whether the start form should be enabled')
      })
    ),
    openRootStartFormEditorOverlay: tool('Open the process start form editor overlay'),

    // overlay

    getCurrentOverlay: tool('Return the currently open overlay'),
    closeOverlay: tool('Close the currently open overlay'),

    // formEditor overlay

    formEditor_getAvailableVariables: tool('List input and output variables available to the currently edited form'),

    formEditor_get: tool('Get the HTML, CSS, or JS for the currently edited form').input(
      z.object({
        type: z.enum(['html', 'css', 'js']).describe('The form content type to read')
      })
    ),

    formEditor_set: tool('Set the HTML, CSS, or JS for the currently edited form').input(
      z.object({
        type: z.enum(['html', 'css', 'js']).describe('The form content type to update'),
        value: z.string().describe('The new form content')
      })
    )
  });

export const processEditorAiStoreFactory = storeFactory(processEditorRoute);

export type ProcessEditorAiBindingsStore = ReturnType<typeof processEditorAiStoreFactory>;
