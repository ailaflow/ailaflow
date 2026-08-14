import assert from 'node:assert/strict';
import test from 'node:test';
import { saveTelegramBotRequestSchema } from './telegram-configuration';

test('validates Telegram bot save requests', () => {
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: 'default', botToken: 'secret' }).success, true);
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: 'default' }).success, true);
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: '', botToken: 'secret' }).success, false);
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: 'default', botToken: '' }).success, false);
});
