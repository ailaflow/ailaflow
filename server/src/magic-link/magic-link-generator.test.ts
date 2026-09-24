import assert from 'node:assert/strict';
import test from 'node:test';
import { KvConfigurationManager } from '../configuration/kv/kv-configuration-manager';
import { createMagicLinkRepositoryMock } from '../repositories/auth-token/magic-link-repository-mock';
import { MagicLink } from '../repositories/auth-token/magic-link';
import { KvConfiguration } from '../repositories/configuration/kv/kv-configuration';
import { MagicLinkGenerator, MagicLinkStatus } from './magic-link-generator';

test('generates and stores magic links with centralized form targets', async () => {
  const inserted: MagicLink[] = [];
  const generator = createGenerator('https://aila.example/proxy/aila', inserted);
  const signal = new AbortController().signal;

  const taskResult = await generator.tryGenerateTaskForm(signal, 'alice', 'task/1');
  const processResult = await generator.tryGenerateProcessStartForm(signal, 'alice', 'employee onboarding');

  assert.equal(taskResult.status, MagicLinkStatus.SUCCESS);
  if (taskResult.status !== MagicLinkStatus.SUCCESS) {
    assert.fail('Expected a task form magic link');
  }
  const taskUrl = new URL(taskResult.url);
  assert.equal(taskUrl.origin + taskUrl.pathname, 'https://aila.example/proxy/aila/magic-link');
  assert.equal(taskUrl.searchParams.get('t'), '/my-tasks/task%2F1?fs=1');
  assert.equal(new URLSearchParams(taskUrl.hash.slice(1)).get('token'), inserted[0].token);
  assert.equal(inserted[0].userName, 'alice');

  assert.equal(processResult.status, MagicLinkStatus.SUCCESS);
  if (processResult.status !== MagicLinkStatus.SUCCESS) {
    assert.fail('Expected a process start form magic link');
  }
  const processUrl = new URL(processResult.url);
  assert.equal(processUrl.searchParams.get('t'), '/my-processes/employee%20onboarding?fs=1');
  assert.equal(new URLSearchParams(processUrl.hash.slice(1)).get('token'), inserted[1].token);
  assert.equal(inserted[1].userName, 'alice');
  assert.equal(generator.getValidityHours(), 2);
});

test('does not create a magic link without a public URL', async () => {
  const inserted: MagicLink[] = [];
  const generator = createGenerator(null, inserted);
  const signal = new AbortController().signal;

  assert.deepEqual(await generator.tryGenerateTaskForm(signal, 'alice', 'task_1'), {
    status: MagicLinkStatus.NOT_CONFIGURED
  });
  assert.equal(inserted.length, 0);
});

test('reports a failure when a magic link cannot be stored', async () => {
  const manager = {
    get: async () => new KvConfiguration('https://aila.example')
  } as unknown as KvConfigurationManager;
  const repository = createMagicLinkRepositoryMock({
    tryInsert: async () => false
  });
  const generator = new MagicLinkGenerator(manager, repository);

  assert.deepEqual(await generator.tryGenerateTaskForm(new AbortController().signal, 'alice', 'task_1'), {
    status: MagicLinkStatus.FAILURE
  });
});

function createGenerator(publicUrl: string | null, inserted: MagicLink[]): MagicLinkGenerator {
  const manager = {
    get: async () => new KvConfiguration(publicUrl)
  } as unknown as KvConfigurationManager;
  const repository = createMagicLinkRepositoryMock({
    tryInsert: async (_, magicLink) => {
      inserted.push(magicLink);
      return true;
    }
  });
  return new MagicLinkGenerator(manager, repository);
}
