export function abortableSleep(signal: AbortSignal, ms: number) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);

      const error = new Error('Sleep aborted');
      error.name = 'AbortError';
      reject(error);
    }

    signal.addEventListener('abort', onAbort);
  });
}
