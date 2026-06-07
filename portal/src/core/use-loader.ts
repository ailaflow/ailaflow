import { useEffect, useState } from 'react';

export type LoaderResult<T> =
  | {
      isLoading: false;
      data: T;
      error?: never;
    }
  | {
      isLoading: false;
      error: Error;
      data?: never;
    }
  | {
      isLoading: true;
      data?: never;
      error?: never;
    };

export function useLoader<T>(loader: (abortSignal: AbortSignal) => Promise<T>, deps: unknown[] = []): LoaderResult<T> {
  const [data, setData] = useState<{
    data?: T;
    error?: Error;
  } | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function load() {
      setData(null);

      try {
        const data = await loader(abortController.signal);
        setData({ data });
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        setData({ error });
      }
    }

    load();
    return () => abortController.abort();
  }, deps);

  if (data === null) {
    return { isLoading: true };
  }
  if (data.error) {
    return { isLoading: false, error: data.error };
  }
  return { isLoading: false, data: data.data! };
}
