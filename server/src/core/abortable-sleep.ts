export function abortableSleep(abortSignal: AbortSignal, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      abortSignal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeout);
      abortSignal.removeEventListener('abort', onAbort);

      const error = new Error('Sleep aborted');
      error.name = 'AbortError';
      reject(error);
    }

    abortSignal.addEventListener('abort', onAbort);
  });
}
