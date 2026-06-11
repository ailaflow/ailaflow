import type { Express, Request, Response } from 'express';
import { SseResponse } from '../core/sse-response';

interface Rpc {
  callId: number;
  executionId: string;
  methodName: string;
  res: Response;
  timeout: number;
  deadline: number;
}

interface ExecuteRpcRequest {
  methodName: string;
  executionId: string;
  data: unknown;
  timeout: number;
}

interface SendRpcReplyRequest {
  callId: number;
  data?: unknown;
  error?: string;
}

interface ListenRpcUpdate {
  ping?: 1;
  rpc?: {
    callId: number;
    methodName: string;
    executionId: string;
    data: unknown;
    timeout: number;
  };
}

const MAX_TIMEOUT = 60_000;

export function setupRpcEndpoints(app: Express): void {
  const rpcs = new Map<number, Rpc>();
  let lastCallId = 0;
  let listener: ((rpc: Rpc, data: unknown) => void) | null = null;

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

    listener = (rpc, data) => {
      sse.write({
        rpc: {
          callId: rpc.callId,
          executionId: rpc.executionId,
          methodName: rpc.methodName,
          timeout: rpc.timeout,
          data
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

    const callId = ++lastCallId;
    const { methodName, executionId, data, timeout } = req.body;
    const now = Date.now();
    const deadline = now + Math.min(timeout, MAX_TIMEOUT);
    const rpc = { callId, methodName, executionId, res, timeout, deadline };
    rpcs.set(callId, rpc);
    listener(rpc, data);
  });

  app.post('/rpc-reply', (req: Request<unknown, unknown, SendRpcReplyRequest>, res: Response) => {
    const { callId, data, error } = req.body;
    const rpc = rpcs.get(callId);
    if (!rpc) {
      res.status(404).json({ error: 'Not found' }).end();
      return;
    }

    rpcs.delete(callId);

    if (!rpc.res.writableEnded) {
      if (data !== undefined) {
        rpc.res.status(200).json(data).end();
      } else {
        rpc.res
          .status(500)
          .json({ error: error ?? 'Incorrect reply' })
          .end();
      }
    }

    res.json({ ok: true }).end();
  });
}
