import { route, routeStoreFactory, tool } from '@aibindkit/react';

const taskListRoute = route('taskList')
  .paths(['/admin/tasks'])
  .unavailable('You are not on a task list page.')
  .tools({
    getTasks: tool('Get the tasks on the current page.')
  });

export const taskListAiStoreFactory = routeStoreFactory(taskListRoute);

export type TaskListAiStore = ReturnType<typeof taskListAiStoreFactory>;
