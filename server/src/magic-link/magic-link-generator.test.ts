import assert from 'node:assert/strict';
import test from 'node:test';
import { KvConfigurationManager } from '../configuration/kv/kv-configuration-manager';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { MagicLink } from '../repositories/auth-token/magic-link';
import { KvConfiguration } from '../repositories/configuration/kv/kv-configuration';
import { MagicLinkGenerator } from './magic-link-generator';

test('generates and stores magic links with centralized form targets', async () => {
  const inserted: MagicLink[] = [];
  const generator = createGenerator('https://aila.example/proxy/aila', inserted);
  const abortSignal = new AbortController().signal;

  const taskResult = await generator.tryGenerateTaskForm(abortSignal, 'alice', 'task/1');
  const processResult = await generator.tryGenerateProcessStartForm(abortSignal, 'alice', 'employee onboarding');

  assert.ok(taskResult);
  const taskUrl = new URL(taskResult);
  assert.equal(taskUrl.origin + taskUrl.pathname, 'https://aila.example/proxy/aila/magic-link');
  assert.equal(taskUrl.searchParams.get('t'), '/my-tasks/task%2F1');
  assert.equal(new URLSearchParams(taskUrl.hash.slice(1)).get('token'), inserted[0].token);
  assert.equal(inserted[0].userName, 'alice');

  assert.ok(processResult);
  const processUrl = new URL(processResult);
  assert.equal(processUrl.searchParams.get('t'), '/my-processes/employee%20onboarding');
  assert.equal(new URLSearchParams(processUrl.hash.slice(1)).get('token'), inserted[1].token);
  assert.equal(inserted[1].userName, 'alice');
  assert.equal(generator.getValidityHours(), 2);
});

test('does not create a magic link without a public URL', async () => {
  const inserted: MagicLink[] = [];
  const generator = createGenerator(null, inserted);
  const abortSignal = new AbortController().signal;

  assert.equal(await generator.tryGenerateTaskForm(abortSignal, 'alice', 'task_1'), null);
  assert.equal(inserted.length, 0);
});

function createGenerator(publicUrl: string | null, inserted: MagicLink[]): MagicLinkGenerator {
  const manager = {
    get: async () => new KvConfiguration(publicUrl)
  } as unknown as KvConfigurationManager;
  const repository: MagicLinkRepository = {
    setup: async () => {},
    insert: async (_, magicLink) => {
      inserted.push(magicLink);
    },
    consume: async () => null,
    deleteExpired: async () => {}
  };
  return new MagicLinkGenerator(manager, repository);
}
