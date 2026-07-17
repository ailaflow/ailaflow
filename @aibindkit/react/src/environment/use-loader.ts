import { useEffect, useMemo, useState } from 'react';

export type LoaderResult<T> =
  | {
      isLoading: false;
      finishSignal: AbortSignal;
      data: T;
      error?: never;
    }
  | {
      isLoading: false;
      finishSignal: AbortSignal;
      error: Error;
      data?: never;
    }
  | {
      isLoading: true;
      finishSignal: AbortSignal;
      data?: never;
      error?: never;
    };

export function useLoader<T>(loader: (abortSignal: AbortSignal) => Promise<T>, deps: unknown[] = []): LoaderResult<T> {
  const finishAbortController = useMemo(() => new AbortController(), deps);
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
        if (!abortController.signal.aborted) {
          setData({ data });
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          const error = e instanceof Error ? e : new Error(String(e));
          setData({ error });
        }
      } finally {
        finishAbortController.abort();
      }
    }

    load();
    return () => abortController.abort();
  }, deps);

  const result = useMemo<LoaderResult<T>>(() => {
    const finishSignal = finishAbortController.signal;
    if (data === null) {
      return { isLoading: true, finishSignal };
    }
    if (data.error) {
      return { isLoading: false, finishSignal, error: data.error };
    }
    return { isLoading: false, finishSignal, data: data.data! };
  }, [data, finishAbortController]);

  return result;
}
