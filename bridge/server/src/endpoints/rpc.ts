import type { Express, Request, Response } from 'express';
import { SseResponse } from '../core/sse-response';

interface Rpc {
  id: number;
  type: string;
  executionToken: string;
  payload: unknown;
  res: Response;
  timeout: number;
  deadline: number;
}

interface ExecuteRpcRequest {
  type: string;
  executionToken: string;
  payload: unknown;
  timeout: number;
}

interface SendRpcReplyRequest {
  id: number;
  payload: unknown;
}

interface ListenRpcUpdate {
  ping?: 1;
  rpc?: {
    id: number;
    type: string;
    executionToken: string;
    payload: unknown;
    timeout: number;
  };
}

const MAX_TIMEOUT = 60_000;

export function setupRpcEndpoints(app: Express): void {
  const rpcs = new Map<number, Rpc>();
  let lastId = 0;
  let listener: ((rpc: Rpc) => void) | null = null;

  app.get('/rpc', (_, res) => {
    const sse = new SseResponse<ListenRpcUpdate>(res);

    function dropOutdatedRequests(): void {
      const now = Date.now();
      for (const [id, rpc] of rpcs) {
        if (rpc.deadline < now) {
          rpcs.delete(id);
          if (!rpc.res.writableEnded) {
            rpc.res.status(504).json({ error: 'Timeout' }).end();
          }
        }
      }
    }

    function sendPing(): void {
      sse.write({ ping: 1 });
    }

    const interval = setInterval(() => {
      dropOutdatedRequests();
      sendPing();
    }, 1_000);

    listener = rpc => {
      sse.write({
        rpc: {
          id: rpc.id,
          type: rpc.type,
          executionToken: rpc.executionToken,
          payload: rpc.payload,
          timeout: rpc.timeout
        }
      });
    };

    sse.onClose(() => {
      clearInterval(interval);
      listener = null;
    });
  });

  app.post('/rpc', (req: Request<unknown, unknown, ExecuteRpcRequest>, res: Response) => {
    if (!listener) {
      res.status(503).json({ error: 'No listener' });
      return;
    }

    const id = ++lastId;
    const { type, executionToken, payload, timeout } = req.body;
    const now = Date.now();
    const deadline = now + Math.min(timeout, MAX_TIMEOUT);
    const rpc = { id, type, executionToken, payload, res, timeout, deadline };
    rpcs.set(id, rpc);
    listener(rpc);
  });

  app.post('/rpc-reply', (req: Request<unknown, unknown, SendRpcReplyRequest>, res: Response) => {
    const { id, payload } = req.body;
    const request = rpcs.get(id);
    if (!request) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    rpcs.delete(id);

    if (!request.res.writableEnded) {
      request.res.json(payload).end();
    }

    res.json({ ok: true }).end();
  });
}
