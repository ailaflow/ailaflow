import * as z from 'zod/v4';
import { route, routeStoreFactory, tool } from '@aibindkit/react';

const sandboxEditorRoute = route('sandboxEditor')
  .paths(['/admin/sandboxes/:name', '/admin/create-sandbox'])
  .unavailable('You are not on a sandbox editor page.')
  .params(
    z.object({
      name: z.string().describe('The name of the sandbox')
    })
  )
  .tools({
    getDetails: tool(
      "Get the sandbox's name, description, enabled status, configuration, and secret names. Secret values are not visible to AI; they are only visible to the user."
    ),

    setIsEnabled: tool('Set whether the sandbox is enabled').input(
      z.object({
        isEnabled: z.boolean().describe('Whether the sandbox should be enabled')
      })
    ),

    setName: tool('Set the name of the sandbox').input(
      z.object({
        name: z.string().describe('The new name of the sandbox')
      })
    ),

    setConfiguration: tool(
      'Set the Docker configuration of the sandbox that will be inserted after the prefix, and before the suffix. DO NOT include the prefix or suffix in this configuration, as they will be automatically added.'
    ).input(
      z.object({
        configuration: z.string().describe('The new configuration of the sandbox')
      })
    ),

    save: tool('Save the changes made to the sandbox')
  });

export const sandboxEditorAiStoreFactory = routeStoreFactory(sandboxEditorRoute);

export type SandboxEditorAiStore = ReturnType<typeof sandboxEditorAiStoreFactory>;
