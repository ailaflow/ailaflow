import assert from 'node:assert/strict';
import test from 'node:test';
import { saveMyTelegramBotRequestSchema } from './telegram-configuration';

test('validates Telegram bot save requests', () => {
  assert.equal(saveMyTelegramBotRequestSchema.safeParse({ channelName: 'default', botToken: 'secret' }).success, true);
  assert.equal(saveMyTelegramBotRequestSchema.safeParse({ channelName: 'default' }).success, true);
  assert.equal(saveMyTelegramBotRequestSchema.safeParse({ channelName: '', botToken: 'secret' }).success, false);
  assert.equal(saveMyTelegramBotRequestSchema.safeParse({ channelName: 'default', botToken: '' }).success, false);
});
