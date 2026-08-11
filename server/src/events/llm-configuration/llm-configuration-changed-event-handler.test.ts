import assert from 'node:assert/strict';
import test from 'node:test';
import { LiveChatSessionStore } from '@aibindkit/express';
import { ChatSession } from '@aibindkit/llm';
import { LlmClientProvider } from '../../llm/llm-client-provider';
import { LlmConfigurationChangedEventHandler } from './llm-configuration-changed-event-handler';

test('flushes all LLM clients and live chat sessions', async () => {
  let flushAllCalls = 0;
  const llmClientProvider = {
    flushAll: () => flushAllCalls++
  } as unknown as LlmClientProvider;
  const liveChatSessionStore = new LiveChatSessionStore();
  let destroyCalls = 0;
  liveChatSessionStore.set({ id: 'session', token: 'token', destroy: () => destroyCalls++ } as unknown as ChatSession);
  const handler = new LlmConfigurationChangedEventHandler(llmClientProvider, liveChatSessionStore);

  await handler.handle();

  assert.equal(flushAllCalls, 1);
  assert.equal(destroyCalls, 1);
  assert.equal(liveChatSessionStore.tryGetById('session'), undefined);
  assert.equal(liveChatSessionStore.tryGetByToken('token'), undefined);
});
