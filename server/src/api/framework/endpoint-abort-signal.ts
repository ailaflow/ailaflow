import { Request } from 'express';

export function getEndpointAbortSignal(req: Request): AbortSignal {
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
  const timeout = AbortSignal.timeout(8_000);
  return AbortSignal.any([abortController.signal, timeout]);
}
