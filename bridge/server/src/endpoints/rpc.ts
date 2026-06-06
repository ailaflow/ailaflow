import type { Express, Request, Response } from 'express';
import { SseResponse } from '../core/sse-response';

interface RpcRequestBody {
  type: string;
  payload: unknown;
}

interface RpcResponseBody {
  id: number;
  payload: unknown;
}

interface RpcRequest {
  id: number;
  type: string;
  payload: unknown;
  res: Response;
  deadline: number;
}

export function setupRpcEndpoint(app: Express): void {
  const rpcMap = new Map<number, RpcRequest>();
  let lastId = 0;
  let listener: ((rpc: RpcRequest) => void) | null = null;

  app.get('/rpc', (_, res) => {
    const sse = new SseResponse(res);

    function dropOutdatedRequests(): void {
      const now = Date.now();
      for (const [id, rpc] of rpcMap) {
        if (rpc.deadline < now) {
          rpcMap.delete(id);
          if (!rpc.res.writableEnded) {
            rpc.res.status(504).json({ error: 'Timeout' }).end();
          }
        }
      }
    }

    function sendPing(): void {
      sse.writeEvent({ ping: true });
    }

    const interval = setInterval(() => {
      dropOutdatedRequests();
      sendPing();
    }, 1_000);

    listener = rpc => {
      sse.writeEvent({
        rpc: {
          id: rpc.id,
          type: rpc.type,
          payload: rpc.payload
        }
      });
    };

    sse.onClose(() => {
      clearInterval(interval);
      listener = null;
    });
  });

  app.post('/rpc', (req: Request<unknown, unknown, RpcRequestBody>, res: Response) => {
    if (!listener) {
      res.status(503).json({ error: 'No listener' });
      return;
    }

    const id = ++lastId;
    const { type, payload } = req.body;
    const now = Date.now();
    const deadline = now + 8_000;
    const rpc = { id, type, payload, res, deadline };
    rpcMap.set(id, rpc);
    listener(rpc);
  });

  app.post('/rpc-response', (req: Request<unknown, unknown, RpcResponseBody>, res: Response) => {
    const { id, payload } = req.body;
    const request = rpcMap.get(id);
    if (!request) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    rpcMap.delete(id);

    if (!request.res.writableEnded) {
      request.res.json(payload).end();
    }

    res.json({ ok: true }).end();
  });
}
