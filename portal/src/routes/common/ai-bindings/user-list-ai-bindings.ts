import { route, routeStoreFactory, tool } from '@aibindkit/react';

const userListRoute = route('userList')
  .paths(['/admin/users'])
  .unavailable('You are not on a user list page.')
  .tools({
    getUsers: tool('Get all created users.'),
    createNew: tool('Open the user creation form.')
  });

export const userListAiStoreFactory = routeStoreFactory(userListRoute);

export type UserListAiStore = ReturnType<typeof userListAiStoreFactory>;
