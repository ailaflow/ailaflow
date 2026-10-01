import assert from 'node:assert/strict';
import test from 'node:test';
import { ChatSession } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import { AdminChatSessionProvider } from '../chat-session/admin-chat-session-provider';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { UserAccessExpressionUserQuerier } from '../queriers/user-access-expression/user-access-expression-user-querier';
import { Notification } from '../repositories/notification/notification';
import { NotificationRepository } from '../repositories/notification/notification-repository';
import { Notifier } from './notifier';

test('persists a notification for every matched user', async () => {
  const storedNotifications: Notification[] = [];
  const userQuerier = {
    queryUserNames: async () => ['alice', 'bob']
  } as UserAccessExpressionUserQuerier;
  const sessionProvider = {
    get: async () => ({ queueUserMessage: () => undefined }) as unknown as ChatSession
  } as unknown as UserChatSessionProvider;
  const adminSessionProvider = {
    tryGet: () => null
  } as unknown as AdminChatSessionProvider;
  const notificationRepository = {
    setup: async () => undefined,
    insertMultiple: async (_abortSignal: AbortSignal, notifications: Notification[]) => {
      storedNotifications.push(...notifications);
    },
    delete: async () => false,
    deleteAll: async () => 0
  } as NotificationRepository;
  const notifier = new Notifier(userQuerier, sessionProvider, adminSessionProvider, notificationRepository);

  await notifier.notifyUsersMatchingAccessExpression(
    new AbortController().signal,
    'test',
    false,
    '',
    DEFAULT_CHANNEL_NAME,
    'Deployment completed'
  );

  assert.equal(storedNotifications.length, 2);
  assert.deepEqual(
    storedNotifications.map(notification => ({
      processName: notification.processName,
      userName: notification.userName,
      message: notification.message
    })),
    [
      { processName: 'test', userName: 'alice', message: 'Deployment completed' },
      { processName: 'test', userName: 'bob', message: 'Deployment completed' }
    ]
  );
  for (const notification of storedNotifications) {
    assert.match(notification.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  }
  assert.equal(new Set(storedNotifications.map(notification => notification.id)).size, storedNotifications.length);
  assert.ok(storedNotifications.every(notification => notification.createdAt > 0));
});
