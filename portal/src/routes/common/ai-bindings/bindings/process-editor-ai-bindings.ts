import z from 'zod/v4';
import { aiBinding, AiBindingsStore, aiRoute, buildAiBindingStoreFactory } from '../ai-bindings';

export const processEditorSetterAiBindings = [
  aiBinding('process_editor_get_details', 'Get the process name, description.').void(),
  aiBinding('process_editor_set_name', 'Set the name of the process').arg(
    z.object({
      name: z.string().describe('The new name of the process')
    })
  )
] as const;

export type ProcessEditorAiBindingsStore = AiBindingsStore<typeof processEditorSetterAiBindings>;

const processEditorRoute = aiRoute(
  'process_editor',
  ['/admin/processes/:name', '/admin/create-process'],
  'You are not on a process editor page.'
).arg(
  z.object({
    name: z.string().describe('The name of the process')
  })
);

export const processEditorAiBindingsFactory = buildAiBindingStoreFactory<typeof processEditorSetterAiBindings, typeof processEditorRoute>(
  processEditorSetterAiBindings,
  processEditorRoute
);
