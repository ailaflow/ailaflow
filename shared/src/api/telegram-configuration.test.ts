import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CHANNEL_NAME } from '../chat-session';
import { saveTelegramBotRequestSchema } from './telegram-configuration';

test('validates Telegram bot save requests', () => {
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: DEFAULT_CHANNEL_NAME, botToken: 'secret' }).success, true);
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: DEFAULT_CHANNEL_NAME }).success, true);
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: '', botToken: 'secret' }).success, false);
  assert.equal(saveTelegramBotRequestSchema.safeParse({ channelName: DEFAULT_CHANNEL_NAME, botToken: '' }).success, false);
});
