import { route, routeStoreFactory, tool } from '@aibindkit/react';
import z from 'zod/v4';

const tableEditorRoute = route('tableEditor')
  .paths(['/admin/tables/:tableName', '/admin/create-table'])
  .unavailable('You are not on a table editor page.')
  .params(
    z.object({
      tableName: z.string().describe('Name of the table to edit')
    })
  )
  .tools({
    getDetails: tool('Get the table name and description'),
    setName: tool('Set the new table name before it is saved').input(
      z.object({
        name: z.string().describe('The table name')
      })
    ),
    setDescription: tool('Update the table description').input(
      z.object({
        description: z.string().describe('The new table description')
      })
    ),
    save: tool('Save the table')
  });

export const tableEditorAiStoreFactory = routeStoreFactory(tableEditorRoute);

export type TableEditorAiStore = ReturnType<typeof tableEditorAiStoreFactory>;
