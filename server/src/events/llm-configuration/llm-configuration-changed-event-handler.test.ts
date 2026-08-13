import assert from 'node:assert/strict';
import test from 'node:test';
import { ChatSessionManager } from '@aibindkit/express';
import { LlmClientProvider } from '../../llm/llm-client-provider';
import { LlmConfigurationChangedEventHandler } from './llm-configuration-changed-event-handler';

test('flushes all LLM clients and live chat sessions', async () => {
  let llmFlushAllCalls = 0;
  const llmClientProvider = {
    flushAll: () => llmFlushAllCalls++
  } as unknown as LlmClientProvider;
  let sessionFlushAllCalls = 0;
  const chatSessionManager = {
    flushAll: () => sessionFlushAllCalls++
  } as unknown as ChatSessionManager;
  const handler = new LlmConfigurationChangedEventHandler(llmClientProvider, chatSessionManager);

  await handler.handle();

  assert.equal(llmFlushAllCalls, 1);
  assert.equal(sessionFlushAllCalls, 1);
});
