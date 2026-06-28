import z from 'zod/v4';
import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';

export const sandboxEditorSetterAiBindings = [
  aiBinding(
    'sandbox_editor_get_details',
    'Get the sandbox’s name, description, enabled status, configuration, and secret names. Secret values are not visible to AI; they are only visible to the user.'
  ).void(),
  aiBinding('sandbox_editor_set_is_enabled', 'Set whether the sandbox is enabled').arg(
    z.object({
      isEnabled: z.boolean().describe('Whether the sandbox should be enabled')
    })
  ),
  aiBinding('sandbox_editor_set_name', 'Set the name of the sandbox').arg(
    z.object({
      name: z.string().describe('The new name of the sandbox')
    })
  ),
  aiBinding(
    'sandbox_editor_set_configuration',
    'Set the Docker configuration of the sandbox that will be inserted after the prefix, and before the suffix. DO NOT include the prefix or suffix in this configuration, as they will be automatically added.'
  ).arg(
    z.object({
      configuration: z.string().describe('The new configuration of the sandbox')
    })
  ),
  aiBinding('sandbox_editor_save', 'Save the changes made to the sandbox').void()
] as const;

export type SandboxEditorAiBindingsStore = AiBindingsStore<typeof sandboxEditorSetterAiBindings>;

const processListRoute = aiRoute(
  'sandbox_editor',
  ['/admin/sandboxes/:name', '/admin/create-sandbox'],
  'You are not on a sandbox editor page.'
).arg(
  z.object({
    name: z.string().describe('The name of the sandbox')
  })
);

export const sandboxEditorAiBindingsFactory = buildAiBindingStoreFactory<typeof sandboxEditorSetterAiBindings, typeof processListRoute>(
  sandboxEditorSetterAiBindings,
  processListRoute
);
