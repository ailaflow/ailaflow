import { route, storeFactory, tool } from '@aibindkit/react';

const userListRoute = route('userList')
  .paths(['/admin/users'])
  .unavailable('You are not on a user list page.')
  .tools({
    getUsers: tool('Get all created users.')
  });

export const userListAiStoreFactory = storeFactory(userListRoute);

export type UserListAiStore = ReturnType<typeof userListAiStoreFactory>;
