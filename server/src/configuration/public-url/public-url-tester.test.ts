import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicUrlTester } from './public-url-tester';

test('tests the health endpoint below a configured proxy path', async () => {
  let requestedUrl: string | null = null;
  await withFetch(
    async input => {
      requestedUrl = input.toString();
      return Response.json({ server: 'ailaflow', status: 'ok' });
    },
    async () => {
      assert.deepEqual(await new PublicUrlTester().test(new AbortController().signal, 'https://ailaflow.example.com/proxy/ailaflow'), {
        publicUrl: 'https://ailaflow.example.com/proxy/ailaflow',
        isAvailable: true,
        error: null
      });
    }
  );
  assert.equal(requestedUrl, 'https://ailaflow.example.com/proxy/ailaflow/health');
});

test('reports HTTP and identity failures as unavailable', async () => {
  await withFetch(
    async () => new Response(null, { status: 404 }),
    async () => {
      assert.deepEqual(await new PublicUrlTester().test(new AbortController().signal, 'https://ailaflow.example.com'), {
        publicUrl: 'https://ailaflow.example.com',
        isAvailable: false,
        error: 'Health endpoint returned HTTP 404.'
      });
    }
  );

  await withFetch(
    async () => Response.json({ server: 'other', status: 'ok' }),
    async () => {
      assert.deepEqual(await new PublicUrlTester().test(new AbortController().signal, 'https://ailaflow.example.com'), {
        publicUrl: 'https://ailaflow.example.com',
        isAvailable: false,
        error: 'Health endpoint returned an unexpected response.'
      });
    }
  );
});

test('reports network failures as unavailable', async () => {
  await withFetch(
    async () => {
      throw new Error('Connection refused');
    },
    async () => {
      assert.deepEqual(await new PublicUrlTester().test(new AbortController().signal, 'https://ailaflow.example.com'), {
        publicUrl: 'https://ailaflow.example.com',
        isAvailable: false,
        error: 'Health endpoint could not be reached.'
      });
    }
  );
});

async function withFetch(fetcher: typeof fetch, callback: () => Promise<void>): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetcher;
  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}
