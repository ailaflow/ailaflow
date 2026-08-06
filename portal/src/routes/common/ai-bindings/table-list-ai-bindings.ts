import { route, routeStoreFactory, tool } from '@aibindkit/react';

const tableListRoute = route('tableList')
  .paths(['/admin/tables'])
  .unavailable('You are not on a table list page.')
  .tools({
    getTables: tool('Get the tables on the current page'),
    createNew: tool('Open a page to create a new table')
  });

export const tableListAiStoreFactory = routeStoreFactory(tableListRoute);

export type TableListAiStore = ReturnType<typeof tableListAiStoreFactory>;
