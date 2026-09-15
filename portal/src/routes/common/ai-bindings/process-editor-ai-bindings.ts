import * as z from 'zod/v4';
import { route, routeStoreFactory, tool } from '@aibindkit/react';
import { jsonSchema, taskFinalizationPolicySchema, taskDeadlinePresetSchema } from '@ailaflow/shared';

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
    getProcessUserAccessExpression: tool('Get the process user access expression'),
    setProcessUserAccessExpression: tool('Update the process user access expression').input(
      z.object({
        userAccessExpression: z.string().describe('The new process user access expression')
      })
    ),
    hasUnsavedChanges: tool('Checks if there is any unsaved change'),
    save: tool('Save all changes'),

    // workflow

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

    // root

    readRootProperties: tool('Read the full JSON for the root process properties'),
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
    getRootVariables: tool('List process variables with their names and JSON schemas').input(
      z.object({
        filter: z.string().optional().describe('Optional filter for variable names')
      })
    ),
    modifyRootVariable: tool('Set or delete a process variable').input(
      z.discriminatedUnion('action', [
        z
          .object({
            action: z.literal('set').describe('Create or update a process variable'),
            name: z.string().min(1).describe('The name of the variable'),
            description: z.string().min(1).describe('The description of the variable'),
            schema: jsonSchema
          })
          .strict(),
        z
          .object({
            action: z.literal('delete').describe('Delete a process variable'),
            name: z.string().min(1).describe('The name of the variable')
          })
          .strict()
      ])
    ),

    // steps

    scriptStep_openScriptEditorOverlay: tool('Open the script editor overlay for a specific script step').input(
      z.object({
        stepId: z.string().describe('The ID of the script step to edit')
      })
    ),
    scriptStep_setSandboxName: tool('Set the sandbox configuration for a specific script step').input(
      z.object({
        stepId: z.string().describe('The ID of the script step to update'),
        sandboxName: z.string().describe('The new sandbox configuration for the script step')
      })
    ),

    agentStep_setPrompt: tool('Set the agent prompt text').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The agent step ID'),
            action: z.literal('string').describe('Set a literal prompt'),
            prompt: z.string().describe('The prompt text')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The agent step ID'),
            action: z.literal('variable').describe('Set the prompt from a string variable'),
            variableName: z.string().describe('The string variable name containing the prompt')
          })
          .strict()
      ])
    ),
    agentStep_setAllowedProcesses: tool('Set which processes the agent can run').input(
      z.object({
        stepId: z.string().describe('The agent step ID'),
        processNames: z.array(z.string()).nullable().describe('Allowed process names; null allows all, an empty list allows none')
      })
    ),
    agentStep_setAllowedVariables: tool('Set which variables the agent can read and write').input(
      z.object({
        stepId: z.string().describe('The agent step ID'),
        variableNames: z.array(z.string()).describe('Allowed variable names; an empty list allows none')
      })
    ),
    agentStep_setSandboxName: tool('Set the agent sandbox').input(
      z.object({
        stepId: z.string().describe('The agent step ID'),
        sandboxName: z.string().describe('The sandbox name')
      })
    ),
    agentStep_isTerminalAllowed: tool('Check whether the agent can run sandbox terminal commands').input(
      z.object({
        stepId: z.string().describe('The agent step ID')
      })
    ),
    agentStep_setTerminalAllowed: tool('Allow or deny sandbox terminal commands for the agent').input(
      z.object({
        stepId: z.string().describe('The agent step ID'),
        isTerminalAllowed: z.boolean().describe('Whether terminal commands are allowed')
      })
    ),

    taskStep_openFormEditorOverlay: tool('Open the form editor overlay for a specific task step').input(
      z.object({
        stepId: z.string().describe('The ID of the task step to edit')
      })
    ),
    taskStep_setTitle: tool('Set the title for a specific task step').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('string').describe('Set a literal title'),
            title: z.string().describe('The new task title')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('variable').describe('Set the title from a string variable'),
            variableName: z.string().describe('The string variable name containing the task title')
          })
          .strict()
      ])
    ),
    taskStep_setInputVariables: tool('Set the list of input variable names for a specific task step').input(
      z.object({
        stepId: z.string().describe('The ID of the task step to update'),
        variableNames: z.array(z.string()).describe('The new list of input variable names for the task step')
      })
    ),
    taskStep_setOutputVariables: tool('Set the list of output variable names for a specific task step').input(
      z.object({
        stepId: z.string().describe('The ID of the task step to update'),
        variableNames: z.array(z.string()).describe('The new list of output variable names for the task step')
      })
    ),
    taskStep_setUserExpression: tool('Set the user expression for a specific task step').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('string').describe('Set a literal user expression'),
            userExpression: z.string().describe('The new user expression')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('variable').describe('Set the user expression from a string variable'),
            variableName: z.string().describe('The string variable name containing the user expression')
          })
          .strict()
      ])
    ),
    taskStep_setMetadataVariableName: tool('Set or clear the task metadata variable').input(
      z.object({
        stepId: z.string().describe('The ID of the task step to update'),
        variableName: z.string().nullable().describe('An object variable name, or null or an empty string to clear')
      })
    ),
    taskStep_setDeadline: tool('Set or clear the task deadline using a preset or string variable').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('preset').describe('Set the deadline from a preset'),
            preset: taskDeadlinePresetSchema.describe('The deadline preset')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('variable').describe('Set the deadline from a string variable'),
            variableName: z.string().describe('The string variable name containing the deadline preset')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the task step to update'),
            action: z.literal('unset').describe('Clear the deadline')
          })
          .strict()
      ])
    ),
    taskStep_setFinalizationPolicy: tool('Set the task finalization policy').input(
      z.object({
        stepId: z.string().describe('The ID of the task step to update'),
        finalizationPolicy: taskFinalizationPolicySchema.describe(
          'Determines when the task is finalized: all_assignees waits for every assigned task to be completed; any_assignee finalizes after the first assigned task is completed'
        )
      })
    ),

    notificationStep_setUserExpression: tool('Set the user expression for a specific notification step').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The ID of the notification step to update'),
            action: z.literal('string').describe('Set a literal user expression'),
            userExpression: z.string().describe('The new user expression')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the notification step to update'),
            action: z.literal('variable').describe('Set the user expression from a string variable'),
            variableName: z.string().describe('The string variable name containing the user expression')
          })
          .strict()
      ])
    ),
    notificationStep_setNotification: tool('Set the notification for a specific notification step').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The ID of the notification step to update'),
            action: z.literal('string').describe('Set a literal notification'),
            notification: z.string().describe('The new notification')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the notification step to update'),
            action: z.literal('variable').describe('Set the notification from a string variable'),
            variableName: z.string().describe('The string variable name containing the notification')
          })
          .strict()
      ])
    ),

    branchStep_setSelectorVariableName: tool('Set the string variable that selects a branch').input(
      z.object({
        stepId: z.string().describe('The ID of the branch step to update'),
        variableName: z.string().describe('The string variable name containing the branch name')
      })
    ),
    branchStep_modifyBranches: tool('Add or delete a branch').input(
      z.discriminatedUnion('action', [
        z
          .object({
            stepId: z.string().describe('The ID of the branch step to update'),
            action: z.literal('add').describe('Add an empty branch'),
            name: z.string().describe('The new branch name')
          })
          .strict(),
        z
          .object({
            stepId: z.string().describe('The ID of the branch step to update'),
            action: z.literal('delete').describe('Delete an existing branch and all steps inside it'),
            name: z.string().describe('The branch name to delete')
          })
          .strict()
      ])
    ),

    returnStep_isOutputFormEnabled: tool('Check whether the output form is enabled'),
    returnStep_setOutputFormEnabled: tool('Enable or disable the output form').input(
      z.object({
        stepId: z.string().describe('The ID of the script step to update'),
        isEnabled: z.boolean().describe('Whether the output form should be enabled')
      })
    ),
    returnStep_openOutputFormEditorOverlay: tool('Open the form editor overlay for a specific return step').input(
      z.object({
        stepId: z.string().describe('The ID of the return step to edit')
      })
    ),
    returnStep_setOutputVariables: tool('Set the list of output variable names for a specific return step').input(
      z.object({
        stepId: z.string().describe('The ID of the return step to update'),
        variableNames: z.array(z.string()).describe('The new list of output variable names for the return step')
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
    scriptEditor_modifyFile: tool('Create, edit, or delete a script file').input(
      z.discriminatedUnion('action', [
        z
          .object({
            action: z.literal('create').describe('Create a new file'),
            filePath: z.string().min(1).describe('The path of the new file'),
            content: z.string().describe('The file content')
          })
          .strict(),
        z
          .object({
            action: z.literal('edit').describe('Edit an existing file'),
            filePath: z.string().min(1).describe('The path of the file to edit'),
            content: z.string().describe('The new file content')
          })
          .strict(),
        z
          .object({
            action: z.literal('delete').describe('Delete an existing file'),
            filePath: z.string().min(1).describe('The path of the file to delete')
          })
          .strict()
      ])
    )
  })
  .currentPageField('overlay', 'getCurrentOverlay')
  .currentPageField('selectedStepId', 'getSelectedStepId');

export const processEditorAiStoreFactory = routeStoreFactory(processEditorRoute);

export type ProcessEditorAiBindingsStore = ReturnType<typeof processEditorAiStoreFactory>;
