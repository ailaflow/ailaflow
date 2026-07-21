import z from 'zod/v4';
import { route, routeStoreFactory, tool } from '@aibindkit/react';
import { jsonSchema } from '@aila/model';

// Conventions:
// - don't add a dot `.` at the end of the description to reduce amount of tokens.
// - keep the descriptions as short as possible to reduce the amount of tokens.

const processEditorRoute = route('processEditor')
  .unavailable('You are not on a process editor page.')
  .paths(['/admin/processes/:processName', '/admin/create-process'])
  .params(
    z.object({
      processName: z.string().describe('Name of the process to edit')
    })
  )
  .tools({
    getProcessNameAndDescription: tool('Get the process name and description'),
    setProcessName: tool('Set the new process name before it is saved').input(
      z.object({
        name: z.string().describe('The process name')
      })
    ),
    setProcessDescription: tool('Update the process description').input(
      z.object({
        name: z.string().describe('The new process description')
      })
    ),

    getAvailableNewStepTypes: tool('List step types that can be added to the workflow'),
    getSelectedStepId: tool('Get the ID of the currently selected workflow step by the user'),
    deleteWorkflowStep: tool('Delete a step from the workflow').input(
      z.object({
        stepId: z.string().describe('The ID of the step to delete')
      })
    ),
    renameWorkflowStep: tool('Rename a workflow step').input(
      z.object({
        stepId: z.string().describe('The ID of the workflow step to rename'),
        newName: z.string().describe('The new name for the workflow step')
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
    createWorkflowStepDraft: tool(
      'Builds a draft JSON object for a new workflow step. This tool does not modify the workflow: it does not add, insert, append, save, or select the step. The returned JSON is only a template. To actually add it to the workflow, call `processEditor_insertWorkflowStep` or `processEditor_appendWorkflowStep` with the returned JSON.'
    ).input(
      z.object({
        type: z.string().describe('Type of workflow step draft to create'),
        name: z.string().describe('Name to use in the workflow step draft')
      })
    ),
    insertWorkflowStep: tool(
      'Insert step JSON before or after a target step; create new JSON with `createWorkflowStepDraft`, or read then delete an existing step before moving it'
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
    appendWorkflowStep: tool(`Append step JSON to the end of a target sequence`).input(
      z.object({
        step: z.any().describe('Valid JSON for the step to append'),
        targetStepId: z
          .string()
          .nullable()
          .describe(`ID of the step whose sequence should receive the new step. Pass null to append to the root sequence.`),
        branchName: z.string().optional().describe('Branch name to append to when the target step contains multiple branches.')
      })
    ),

    hasUnsavedChanges: tool('Checks if there is any unsaved change'),
    save: tool('Save all changes'),

    // root

    isRootStartFormEnabled: tool('Check whether the process start form is enabled'),
    setRootStartFormEnabled: tool('Enable or disable the process start form').input(
      z.object({
        isEnabled: z.boolean().describe('Whether the start form should be enabled')
      })
    ),
    openRootStartFormEditorOverlay: tool('Open the process start form editor overlay'),
    getRootStartVariables: tool('List of required input variables to start the process'),
    setRootStartVariables: tool('Set the list of required input variables to start the process').input(
      z.object({
        variableNames: z.array(z.string()).describe('The list of required input variable names')
      })
    ),
    getRootVariables: tool('List process variables with their names and JSON schemas'),
    getRootVariableSchema: tool('Get the JSON schema for a specific process variable').input(
      z.object({
        name: z.string().min(1).describe('The name of the variable')
      })
    ),
    setRootVariable: tool(
      'Sets a process variable. The variable must have a name and a valid JSON schema. If it does not exist, it is created. If it already exists, it is overwritten.'
    ).input(
      z.object({
        name: z.string().min(1).describe('The name of the variable'),
        description: z.string().min(1).describe('The description of the variable'),
        schema: jsonSchema
      })
    ),
    deleteRootVariable: tool('Deletes a process variable by name').input(
      z.object({
        name: z.string().min(1).describe('The name of the variable')
      })
    ),

    // steps

    scriptStep_openScriptEditorOverlay: tool('Open the script editor overlay for a specific script step').input(
      z.object({
        stepId: z.string().describe('The ID of the script step to edit')
      })
    ),
    scriptStep_getSandboxName: tool('Get the sandbox configuration for a specific script step'),
    scriptStep_setSandboxName: tool('Set the sandbox configuration for a specific script step').input(
      z.object({
        stepId: z.string().describe('The ID of the script step to update'),
        sandboxName: z.string().describe('The new sandbox configuration for the script step')
      })
    ),

    // overlay

    getCurrentOverlay: tool('Return the currently open overlay'),
    closeOverlay: tool('Close the currently open overlay'),

    // formEditor overlay

    formEditor_getVariables: tool('List input and output variables available to the currently edited form'),
    formEditor_getContent: tool('Get the HTML, CSS, or JS for the currently edited form').input(
      z.object({
        part: z.enum(['html', 'css', 'js']).describe('The form content type to read')
      })
    ),
    formEditor_setContent: tool('Set the HTML, CSS, or JS for the currently edited form').input(
      z.object({
        part: z.enum(['html', 'css', 'js']).describe('The form content type to update'),
        content: z.string().describe('The new form content')
      })
    ),
    formEditor_getInputJsonExample: tool('Get the JSON example for the input variable').input(
      z.object({
        variableName: z.string().min(1).describe('The name of the variable')
      })
    ),
    formEditor_setInputJsonExample: tool('Set the JSON example for the input variable').input(
      z.object({
        variableName: z.string().min(1).describe('The name of the variable'),
        content: z.unknown().describe('The JSON content for the input variable')
      })
    ),

    // scriptEditor overlay

    scriptEditor_getFiles: tool('Returns a list of created files'),
    scriptEditor_getCurrentOpenFile: tool('Return the currently open file in the script editor'),
    scriptEditor_getContent: tool('Return the content of a specific file').input(
      z.object({
        filePath: z.string().min(1).describe('The path of the file to read')
      })
    ),
    scriptEditor_setContent: tool('Set the content of a specific file').input(
      z.object({
        filePath: z.string().min(1).describe('The path of the file to update'),
        content: z.string().describe('The new content for the file'),
        mode: z.enum(['edit', 'create']).describe('Set "edit" to update the file, "create" to create a new file')
      })
    ),
    scriptEditor_deleteFile: tool('Delete a specific file').input(
      z.object({
        filePath: z.string().min(1).describe('The path of the file to delete')
      })
    )
  })
  .currentPageField('overlay', 'getCurrentOverlay')
  .currentPageField('selectedStepId', 'getSelectedStepId');

export const processEditorAiStoreFactory = routeStoreFactory(processEditorRoute);

export type ProcessEditorAiBindingsStore = ReturnType<typeof processEditorAiStoreFactory>;
