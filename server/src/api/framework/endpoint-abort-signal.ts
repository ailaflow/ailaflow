import { Request } from 'express';

export function getEndpointAbortSignal(req: Request, timeoutMs = 8_000): AbortSignal {
  const abortController = new AbortController();
  req.on('close', () => {
    if (!req.complete) {
      abortController.abort();
    }
  });
  req.res?.on('close', () => {
    if (!req.res?.writableEnded) {
      abortController.abort();
    }
  });
  const timeout = AbortSignal.timeout(timeoutMs);
  return AbortSignal.any([abortController.signal, timeout]);
}
