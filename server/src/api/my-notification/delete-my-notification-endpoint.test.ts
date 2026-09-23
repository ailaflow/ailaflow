import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { NotificationRepository } from '../../repositories/notification/notification-repository';
import { EndpointError } from '../framework/endpoint-error';
import { DeleteMyNotificationEndpoint } from './delete-my-notification-endpoint';

test('deletes a notification belonging to the authenticated user', async () => {
  let deleted: { userName: string; id: string } | null = null;
  const endpoint = new DeleteMyNotificationEndpoint(
    createRepository(async (userName, id) => {
      deleted = { userName, id };
      return true;
    })
  );

  assert.deepEqual(await endpoint.handle(createRequest('notification_1', 'alice')), { id: 'notification_1' });
  assert.deepEqual(deleted, { userName: 'alice', id: 'notification_1' });
});

test('returns not found when the notification does not belong to the authenticated user', async () => {
  const endpoint = new DeleteMyNotificationEndpoint(createRepository(async () => false));

  await assert.rejects(
    () => endpoint.handle(createRequest('notification_1', 'alice')),
    error => error instanceof EndpointError && error.status === 404 && error.message === 'Notification not found'
  );
});

function createRepository(deleteNotification: (userName: string, id: string) => Promise<boolean>): NotificationRepository {
  return {
    setup: async () => undefined,
    insertMultiple: async () => undefined,
    delete: async (_, userName, id) => deleteNotification(userName, id),
    deleteAll: async () => 0
  };
}

function createRequest(id: string, userName: string): Request {
  return Object.assign(new EventEmitter(), {
    params: { id },
    authToken: new AuthToken('token', userName, Date.now() + 60_000, false)
  }) as unknown as Request;
}
