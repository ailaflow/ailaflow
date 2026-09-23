import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { NotificationRepository } from '../../repositories/notification/notification-repository';
import { DeleteAllMyNotificationsEndpoint } from './delete-all-my-notifications-endpoint';

test('deletes all notifications belonging to the authenticated user', async () => {
  let deletedForUser: string | null = null;
  const repository = {
    setup: async () => undefined,
    insertMultiple: async () => undefined,
    delete: async () => false,
    deleteAll: async (_: AbortSignal, userName: string) => {
      deletedForUser = userName;
      return 3;
    }
  } as NotificationRepository;
  const endpoint = new DeleteAllMyNotificationsEndpoint(repository);

  assert.deepEqual(await endpoint.handle(createRequest('alice')), { deletedCount: 3 });
  assert.equal(deletedForUser, 'alice');
});

function createRequest(userName: string): Request {
  return Object.assign(new EventEmitter(), {
    authToken: new AuthToken('token', userName, Date.now() + 60_000, false)
  }) as unknown as Request;
}
